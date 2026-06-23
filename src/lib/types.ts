// Shared types between front-end and back-end.

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  // tools the assistant requested during this message
  toolCalls?: ToolCall[];
  // still receiving tokens?
  streaming?: boolean;
}

export type ToolStatus =
  | "requested"        // model requested the tool
  | "awaiting-approval" // sensitive tool waiting for human approval (HITL)
  | "running"          // executing
  | "done"
  | "error";

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: ToolStatus;
  sensitive: boolean;
  result?: unknown;
  error?: string;
}

// SSE events emitted by /api/chat to the client.
export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; input: Record<string, unknown>; sensitive: boolean; status: ToolStatus }
  | { type: "tool_result"; id: string; result?: unknown; error?: string; status: "done" | "error" }
  // paused: model paused waiting for human approval; includes full turn content for resumption
  | { type: "paused"; assistantContent: unknown[]; nonSensitiveResults: Array<{ tool_use_id: string; content: string }> }
  | { type: "error"; message: string }
  | { type: "done" };
