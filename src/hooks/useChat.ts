"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage, ToolCall } from "@/lib/types";
import { isSensitive } from "@/lib/tools/registry";
import type Anthropic from "@anthropic-ai/sdk";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Internal state for HITL resumption.
interface HitlState {
  assistantContent: Anthropic.ContentBlock[];
  nonSensitiveResults: Array<{ tool_use_id: string; content: string }>;
  sensitiveResults: Map<string, { content: string; is_error?: boolean }>;
  pendingIds: Set<string>;
  assistantMsgId: string;
  priorApiMessages: Anthropic.MessageParam[];
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Raw message history in Anthropic format (accumulated across turns)
  const rawMessagesRef = useRef<Anthropic.MessageParam[]>([]);
  const hitlRef = useRef<HitlState | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const patchMsg = (id: string, fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));

  // Consumes an SSE stream from /api/chat. Returns "done" | "paused".
  const consumeStream = async (
    apiMessages: Anthropic.MessageParam[],
    assistantMsgId: string,
    signal: AbortSignal
  ): Promise<"done" | "paused"> => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages }),
      signal,
    });
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let outcome: "done" | "paused" = "done";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const evt = JSON.parse(line.slice(6));

        if (evt.type === "text") {
          patchMsg(assistantMsgId, (m) => ({
            ...m,
            content: m.content + (evt.delta as string),
          }));
        } else if (evt.type === "tool") {
          const tool: ToolCall = {
            id: evt.id as string,
            name: evt.name as string,
            input: evt.input as Record<string, unknown>,
            status: evt.status,
            sensitive: Boolean(evt.sensitive),
          };
          patchMsg(assistantMsgId, (m) => ({
            ...m,
            toolCalls: [...(m.toolCalls ?? []), tool],
          }));
        } else if (evt.type === "tool_result") {
          patchMsg(assistantMsgId, (m) => ({
            ...m,
            toolCalls: (m.toolCalls ?? []).map((tc) =>
              tc.id === evt.id
                ? { ...tc, status: evt.status, result: evt.result, error: evt.error }
                : tc
            ),
          }));
        } else if (evt.type === "paused") {
          outcome = "paused";
          const assistantContent = evt.assistantContent as Anthropic.ContentBlock[];

          // Determine sensitive tools from the assistant's content blocks
          const sensitiveIds = new Set(
            assistantContent
              .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && isSensitive(b.name))
              .map((b) => b.id)
          );

          hitlRef.current = {
            assistantContent,
            nonSensitiveResults: evt.nonSensitiveResults as Array<{ tool_use_id: string; content: string }>,
            sensitiveResults: new Map(),
            pendingIds: sensitiveIds,
            assistantMsgId,
            priorApiMessages: apiMessages,
          };
        } else if (evt.type === "error") {
          patchMsg(assistantMsgId, (m) => ({
            ...m,
            content: m.content + `\n\n_[error: ${evt.message as string}]_`,
          }));
        }
      }
    }

    return outcome;
  };

  // Resumes streaming after all sensitive tools have been resolved.
  const resumeAfterHitl = useCallback(async () => {
    const hitl = hitlRef.current;
    if (!hitl) return;

    // Ordena os tool_results conforme a ordem original do assistente
    const order = hitl.assistantContent
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => b.id);

    const allToolResults: Anthropic.ToolResultBlockParam[] = [
      ...hitl.nonSensitiveResults.map((r) => ({
        type: "tool_result" as const,
        tool_use_id: r.tool_use_id,
        content: r.content,
      })),
      ...Array.from(hitl.sensitiveResults.entries()).map(([id, r]) => ({
        type: "tool_result" as const,
        tool_use_id: id,
        content: r.content,
        is_error: r.is_error,
      })),
    ].sort((a, b) => order.indexOf(a.tool_use_id) - order.indexOf(b.tool_use_id));

    const resumeApiMessages: Anthropic.MessageParam[] = [
      ...hitl.priorApiMessages,
      { role: "assistant", content: hitl.assistantContent },
      { role: "user", content: allToolResults },
    ];

    rawMessagesRef.current = resumeApiMessages;
    hitlRef.current = null;

    // New message bubble for the continuation response
    const newMsgId = uid();
    const newMsg: ChatMessage = {
      id: newMsgId,
      role: "assistant",
      content: "",
      streaming: true,
      toolCalls: [],
    };
    setMessages((prev) => [...prev, newMsg]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsStreaming(true);

    try {
      await consumeStream(resumeApiMessages, newMsgId, ctrl.signal);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        patchMsg(newMsgId, (m) => ({
          ...m,
          content: m.content + `\n\n_[connection failed]_`,
        }));
      }
    } finally {
      patchMsg(newMsgId, (m) => ({ ...m, streaming: false }));
      setIsStreaming(false);
      abortRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Approves and executes a sensitive tool.
  const approveTool = useCallback(
    async (toolId: string) => {
      const hitl = hitlRef.current;
      if (!hitl) return;

      const toolBlock = hitl.assistantContent.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.id === toolId
      );
      if (!toolBlock) return;

      patchMsg(hitl.assistantMsgId, (m) => ({
        ...m,
        toolCalls: (m.toolCalls ?? []).map((tc) =>
          tc.id === toolId ? { ...tc, status: "running" } : tc
        ),
      }));

      try {
        const res = await fetch("/api/tools/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: toolBlock.name,
            input: toolBlock.input,
            idempotencyKey: toolId,
          }),
        });
        const data = (await res.json()) as { result?: unknown; error?: string };
        if (data.error) throw new Error(data.error);

        patchMsg(hitl.assistantMsgId, (m) => ({
          ...m,
          toolCalls: (m.toolCalls ?? []).map((tc) =>
            tc.id === toolId ? { ...tc, status: "done", result: data.result } : tc
          ),
        }));
        hitl.sensitiveResults.set(toolId, { content: JSON.stringify(data.result) });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Execution failed";
        patchMsg(hitl.assistantMsgId, (m) => ({
          ...m,
          toolCalls: (m.toolCalls ?? []).map((tc) =>
            tc.id === toolId ? { ...tc, status: "error", error } : tc
          ),
        }));
        hitl.sensitiveResults.set(toolId, { content: `Error: ${error}`, is_error: true });
      }

      hitl.pendingIds.delete(toolId);
      if (hitl.pendingIds.size === 0) {
        await resumeAfterHitl();
      }
    },
    [resumeAfterHitl]
  );

  // Rejects a sensitive tool.
  const rejectTool = useCallback(
    async (toolId: string) => {
      const hitl = hitlRef.current;
      if (!hitl) return;

      patchMsg(hitl.assistantMsgId, (m) => ({
        ...m,
        toolCalls: (m.toolCalls ?? []).map((tc) =>
          tc.id === toolId
            ? { ...tc, status: "error", error: "Action rejected by user." }
            : tc
        ),
      }));
      hitl.sensitiveResults.set(toolId, {
        content: "Action rejected by user.",
        is_error: true,
      });
      hitl.pendingIds.delete(toolId);

      if (hitl.pendingIds.size === 0) {
        await resumeAfterHitl();
      }
    },
    [resumeAfterHitl]
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: "",
        streaming: true,
        toolCalls: [],
      };

      const apiMessages: Anthropic.MessageParam[] = [
        ...rawMessagesRef.current,
        { role: "user", content: text },
      ];
      rawMessagesRef.current = apiMessages;

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        await consumeStream(apiMessages, assistantMsg.id, ctrl.signal);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          patchMsg(assistantMsg.id, (m) => ({
            ...m,
            content: m.content + `\n\n_[connection failed]_`,
          }));
        }
      } finally {
        patchMsg(assistantMsg.id, (m) => ({ ...m, streaming: false }));
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isStreaming]
  );

  return { messages, isStreaming, send, stop, approveTool, rejectTool };
}
