# Project instructions

Next.js 15 AI chat assistant demonstrating streaming, tool calling, human-in-the-loop (HITL), TanStack Query, and RAG.

## Stack and conventions
- Next.js 15 App Router, strict TypeScript, Tailwind, TanStack Query, Anthropic SDK, Zod.
- Import alias: `@/*` → `src/*`.
- All comments and UI text in English.
- In-memory mock — **no database, no auth**. Focus is on the AI/UX layer.
- Small, reusable components (`src/components/ui`). Small, descriptive commits.

## Code map
- `src/app/api/chat/route.ts` — SSE streaming with Claude; emits `text` and `tool` events.
- `src/app/api/tools/execute/route.ts` — `POST /api/tools/execute`; executes a tool from the client (HITL approval flow).
- `src/app/api/patients/route.ts` — mock patient list.
- `src/hooks/useChat.ts` — reads the stream client-side, builds state, abort, HITL approval/rejection.
- `src/components/chat/*` — ChatWindow, MessageBubble, ToolCallCard, ApprovalBar.
- `src/lib/tools/registry.ts` — tool definitions + `sensitive` flag (HITL) + Anthropic-format schemas.
- `src/lib/tools/handlers.ts` — mock execution + Zod validation + retry + idempotency.
- `src/lib/retry.ts` — exponential backoff + jitter (`TransientError`).
- `src/lib/formatDate.ts` — formats ISO date strings for display.

## Implementation rules
- Do not add heavy libraries. Prefer what is already in `package.json`.
- Tools that modify data (`sensitive: true`) **never** execute without human approval.
- Always pass `idempotencyKey` (the `tool_use` id) to `executeTool`.
- Keep streaming responsive; throttle renders if needed.
