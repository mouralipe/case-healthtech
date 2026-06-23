import { withRetry } from "@/lib/retry";
import { toolRegistry, type ToolName } from "./registry";
import faqData from "../../../data/faq.json";

// ---- In-memory mock data (no database; focus is on the AI/UX layer) ----
const patients: Record<string, { name: string; phone: string; lastVisit: string }> = {
  "p-001": { name: "Maria Silva", phone: "+351 912 000 001", lastVisit: "2026-05-10" },
  "p-002": { name: "John Santos", phone: "+351 912 000 002", lastVisit: "2026-04-22" },
};

const schedule: Record<string, string[]> = {
  "2026-06-24": ["09:00", "10:00", "11:30", "15:00"],
};

// ---- Idempotency: retries must not duplicate actions (e.g. double-booking) ----
const idempotencyCache = new Map<string, unknown>();

/**
 * Executes a tool with Zod validation, exponential-backoff retry, and idempotency.
 * @param idempotencyKey typically the tool_use id from the model.
 */
export async function executeTool(
  name: ToolName,
  rawInput: unknown,
  idempotencyKey: string
): Promise<unknown> {
  // 1. Idempotency check
  if (idempotencyCache.has(idempotencyKey)) {
    return idempotencyCache.get(idempotencyKey);
  }

  // 2. Input validation
  const def = toolRegistry[name];
  if (!def) throw new Error(`Unknown tool: ${name}`);
  const input = def.schema.parse(rawInput);

  // 3. Execute with retry
  const result = await withRetry(() => runTool(name, input), { retries: 3, baseMs: 300 });

  idempotencyCache.set(idempotencyKey, result);
  return result;
}

async function runTool(name: ToolName, input: any): Promise<unknown> {
  switch (name) {
    case "getSchedule":
      return { date: input.date, slots: schedule[input.date] ?? [] };
    case "getPatient":
      return patients[input.id] ?? { error: "Patient not found" };
    case "bookAppointment":
      return {
        ok: true,
        confirmation: `Appointment booked for ${patients[input.patientId]?.name ?? input.patientId} at ${input.slot}`,
      };
    case "sendFollowup":
      return {
        ok: true,
        sentTo: patients[input.patientId]?.phone ?? input.patientId,
        message: input.message,
      };
    case "searchFAQ": {
      const terms = (input.query as string).toLowerCase().split(/\s+/);
      const results = faqData
        .filter((item) => {
          const haystack = [item.question, item.answer, ...item.tags].join(" ").toLowerCase();
          return terms.some((t) => haystack.includes(t));
        })
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          source: `data/faq.json#${item.id}`,
        }));
      return { results, total: results.length };
    }
    default:
      throw new Error(`No handler for tool: ${name}`);
  }
}
