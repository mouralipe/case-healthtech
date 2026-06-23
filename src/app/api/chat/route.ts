import { anthropic, MODEL, SYSTEM_PROMPT } from "@/lib/anthropic";
import { anthropicTools, isSensitive } from "@/lib/tools/registry";
import { executeTool } from "@/lib/tools/handlers";
import type { ToolName } from "@/lib/tools/registry";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// POST /api/chat — full-agent SSE streaming loop:
// - Non-sensitive tools are executed automatically on the server (stream is not interrupted).
// - Sensitive tools emit a "paused" event and wait for human approval on the client.
export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: Anthropic.MessageParam[];
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: Record<string, unknown> = {}) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
        );

      try {
        let currentMessages: Anthropic.MessageParam[] = messages;
        let continueLoop = true;

        while (continueLoop) {
          const run = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools: anthropicTools,
            messages: currentMessages,
          });

          // Stream text tokens incrementally
          run.on("text", (delta) => send("text", { delta }));

          const final = await run.finalMessage();

          if (final.stop_reason === "end_turn" || final.stop_reason === "stop_sequence") {
            send("done");
            continueLoop = false;
          } else if (final.stop_reason === "tool_use") {
            const toolBlocks = final.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );

            const sensitive = toolBlocks.filter((b) => isSensitive(b.name));
            const nonSensitive = toolBlocks.filter((b) => !isSensitive(b.name));

            // Execute non-sensitive tools immediately on the server
            const nonSensitiveResults: Anthropic.ToolResultBlockParam[] = [];
            for (const tool of nonSensitive) {
              send("tool", {
                id: tool.id,
                name: tool.name,
                input: tool.input,
                sensitive: false,
                status: "running",
              });
              try {
                const result = await executeTool(tool.name as ToolName, tool.input, tool.id);
                send("tool_result", { id: tool.id, result, status: "done" });
                nonSensitiveResults.push({
                  type: "tool_result",
                  tool_use_id: tool.id,
                  content: JSON.stringify(result),
                });
              } catch (err) {
                const error = err instanceof Error ? err.message : "Execution failed";
                send("tool_result", { id: tool.id, error, status: "error" });
                nonSensitiveResults.push({
                  type: "tool_result",
                  tool_use_id: tool.id,
                  content: `Error: ${error}`,
                  is_error: true,
                });
              }
            }

            if (sensitive.length > 0) {
              // Emit sensitive tools for human approval and pause the loop
              for (const tool of sensitive) {
                send("tool", {
                  id: tool.id,
                  name: tool.name,
                  input: tool.input,
                  sensitive: true,
                  status: "awaiting-approval",
                });
              }
              // Send the full turn content so the client can resume later
              send("paused", {
                assistantContent: final.content,
                nonSensitiveResults,
              });
              continueLoop = false;
            } else {
              // No sensitive tools: continue the loop with collected results
              currentMessages = [
                ...currentMessages,
                { role: "assistant", content: final.content },
                { role: "user", content: nonSensitiveResults },
              ];
            }
          } else {
            // Any other stop_reason (e.g. max_tokens)
            send("done");
            continueLoop = false;
          }
        }
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
