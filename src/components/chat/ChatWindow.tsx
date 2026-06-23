"use client";

import { Button } from "@/components/ui/Button";
import { useChat } from "@/hooks/useChat";
import { Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { ToolCallCard } from "./ToolCallCard";

const SUGGESTIONS = [
  "What time slots are available on 2026-06-24?",
  "Show me patient p-001's information",
  "Book an appointment for patient p-001 at 2026-06-24 10:00",
  "How does the follow-up system work?",
];

export function ChatWindow() {
  const { messages, isStreaming, send, stop, approveTool, rejectTool } = useChat();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    const text = input;
    setInput("");
    void send(text);
  };

  return (
    <div className="flex h-full flex-col">
      {/* message history */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-md text-center text-sm text-slate-500">
            <p className="mb-4">Qubio operational assistant. Try asking:</p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-left hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => {
          const toolsBefore = m.toolCalls?.filter((tc) => !tc.sensitive) ?? [];
          const toolsAfter = m.toolCalls?.filter((tc) => tc.sensitive) ?? [];
          return (
            <div key={m.id} className="space-y-3">
              {toolsBefore.map((tc) => (
                <ToolCallCard key={tc.id} tool={tc} onApprove={approveTool} onReject={rejectTool} />
              ))}
              <MessageBubble message={m} />
              {toolsAfter.map((tc) => (
                <ToolCallCard key={tc.id} tool={tc} onApprove={approveTool} onReject={rejectTool} />
              ))}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* input */}
      <div className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Write a message…"
            className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          {isStreaming ? (
            <Button variant="danger" onClick={stop}>
              <Square size={16} /> Stop
            </Button>
          ) : (
            <Button onClick={submit} disabled={!input.trim()}>
              <Send size={16} /> Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
