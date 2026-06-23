"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/types";
import { clsx } from "@/lib/clsx";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  if (!isUser && !message.content && !message.streaming) return null;
  return (
    <div className={clsx("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-brand-600 text-white"
            : "bg-white text-slate-800 border border-slate-200"
        )}
      >
        {isUser ? (
          // User messages: plain text, preserve line breaks
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          // Assistant messages: render markdown
          <div
            className={clsx(
              "prose prose-sm max-w-none",
              "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
              "prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1",
              "prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-[11px]",
              "prose-pre:bg-slate-100 prose-pre:text-xs",
              "prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1",
              message.streaming && message.content && "streaming-cursor"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
        {message.streaming && !message.content && (
          <span className="text-slate-400">typing…</span>
        )}
      </div>
    </div>
  );
}
