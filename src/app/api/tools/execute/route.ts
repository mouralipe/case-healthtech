import { executeTool } from "@/lib/tools/handlers";
import type { ToolName } from "@/lib/tools/registry";

export const runtime = "nodejs";

// POST /api/tools/execute — executes a tool from the client (human-in-the-loop).
// Receives: { name, input, idempotencyKey }
// Returns: { result } or { error }
export async function POST(req: Request) {
  try {
    const { name, input, idempotencyKey } = (await req.json()) as {
      name: string;
      input: Record<string, unknown>;
      idempotencyKey: string;
    };

    if (!name || !idempotencyKey) {
      return Response.json({ error: "name and idempotencyKey are required" }, { status: 400 });
    }

    // Only executes known tools (registry validates internally)
    const result = await executeTool(name as ToolName, input, idempotencyKey);

    return Response.json({ result });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to execute tool" },
      { status: 500 }
    );
  }
}
