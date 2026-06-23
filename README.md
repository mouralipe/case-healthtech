# Qubio Ops Assistant

AI chat assistant for clinic operations. The user talks in natural language and the agent executes actions via **tools**: check schedule, look up patients, book appointments, and send follow-ups.

## What this project demonstrates

| Feature | Where |
|---|---|
| **Token-by-token streaming (SSE)** | `src/app/api/chat/route.ts` + `src/hooks/useChat.ts` |
| **Full agent loop** (auto-execute → feed result → continue) | `src/app/api/chat/route.ts` |
| **Generation cancellation** (AbortController) | `useChat.ts` (`stop`) + Stop button |
| **Tool calling with visual states** | `src/components/chat/ToolCallCard.tsx` |
| **Human-in-the-loop** (approve sensitive actions) | `src/components/chat/ApprovalBar.tsx` + `sensitive` flag in registry |
| **Retries (exponential backoff) + idempotency** | `src/lib/retry.ts` + `src/lib/tools/handlers.ts` |
| **RAG** (keyword search over FAQ) | `src/lib/tools/handlers.ts` (`searchFAQ`) + `data/faq.json` |
| **TanStack Query** (server-state, patients panel) | `src/components/PacientesPanel.tsx` |
| **Responsive layout** (sidebar on md+, hamburger drawer on mobile) | `src/components/PacientesPanel.tsx` |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · TanStack Query · Anthropic SDK · Zod

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

## Architecture

```
Client (useChat) --POST /api/chat--> Route Handler --messages.stream--> Claude
      ^  reads ReadableStream (SSE), renders tokens and tool calls in real time
      |
      |  sensitive tool? → emits "paused" → client waits for human approval
      |                  → POST /api/tools/execute → resume stream
      |
   local state (stream is ephemeral — kept out of TanStack Query intentionally)
```

Key decisions:
- **SSE for streaming**: unidirectional server→client, simple over HTTP, ideal for LLM output.
- **Stream outside TanStack Query**: Query is for cacheable server-state; the stream is ephemeral.
- **Human-in-the-loop for data-mutating tools**: critical in a healthcare context.
- **Idempotency on tool execution**: retries cannot duplicate a booking.
- **Non-sensitive tools run server-side automatically**; only sensitive ones pause for approval.

## Next steps

- **Edit args before approval** — let the user tweak tool input (e.g. change the time slot) before confirming a sensitive action.
- **Persistent storage** — replace the in-memory mock with a real database (e.g. Postgres via Prisma) to retain patients, appointments, and conversation history across sessions.
- **Authentication** — add user/clinic identity (e.g. NextAuth) so each operator sees only their own data.
- **MCP server** — expose the tools in `src/lib/tools/` as an [MCP](https://modelcontextprotocol.io) server so any compatible client (Claude Code, Cursor) can reuse them without duplicating integration logic.
- **Semantic RAG** — replace keyword search with vector embeddings (e.g. pgvector or a dedicated vector store) for more robust FAQ retrieval.
- **Audit log** — record every approved/rejected tool action with timestamp and operator identity, essential for compliance in healthcare.
- **AI provider agnostic** — abstract the Anthropic SDK behind a common interface so the model and API key can be swapped (e.g. OpenAI, Google Gemini) without touching application logic.

## Suggested prompts to test

- `What time slots are available on 2026-06-24?`
- `Show me patient p-001's information`
- `Book an appointment for patient p-001 at 2026-06-24T10:00` *(triggers HITL approval)*
- `Send a follow-up message to patient p-002` *(triggers HITL approval)*
- `What is your cancellation policy?` *(triggers RAG search)*
