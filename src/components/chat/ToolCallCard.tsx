"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ToolCall } from "@/lib/types";
import { clsx } from "@/lib/clsx";
import { dateAwareStringify } from "@/lib/formatDate";
import { ApprovalBar } from "./ApprovalBar";

const statusLabel: Record<ToolCall["status"], string> = {
  requested: "Requested",
  "awaiting-approval": "Awaiting approval",
  running: "Running…",
  done: "Done",
  error: "Error",
};

const statusColor: Record<ToolCall["status"], string> = {
  requested: "bg-slate-100 text-slate-600",
  "awaiting-approval": "bg-amber-100 text-amber-700",
  running: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
};

// Card that visualizes a tool call — the visible "tool calling" in the UI.
// Starts collapsed; opens automatically when human action is required.
export function ToolCallCard({
  tool,
  onApprove,
  onReject,
}: {
  tool: ToolCall;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const requiresAction = tool.status === "awaiting-approval";
  const [expanded, setExpanded] = useState(requiresAction);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 text-slate-800 overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 transition-colors"
      >
        <span className="text-slate-400">
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span className="font-mono text-xs font-semibold flex-1">🔧 {tool.name}</span>
        <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium", statusColor[tool.status])}>
          {statusLabel[tool.status]}
        </span>
      </button>

      {/* Collapsible body */}
      {expanded && (
        <div className="border-t border-slate-200 px-3 pb-3 pt-2">
          <pre className="overflow-x-auto rounded-md bg-white p-2 text-[11px] text-slate-600">
            {dateAwareStringify(tool.input)}
          </pre>

          {/* Human-in-the-loop: shown when the tool is sensitive */}
          {tool.status === "awaiting-approval" && (
            <ApprovalBar
              onApprove={() => onApprove?.(tool.id)}
              onReject={() => onReject?.(tool.id)}
            />
          )}

          {tool.status === "done" && tool.result != null && (
            <pre className="mt-2 overflow-x-auto rounded-md bg-green-50 p-2 text-[11px] text-green-800">
              {dateAwareStringify(tool.result)}
            </pre>
          )}

          {tool.status === "error" && (
            <p className="mt-2 text-xs text-red-600">{tool.error ?? "Failed to execute tool."}</p>
          )}
        </div>
      )}
    </div>
  );
}
