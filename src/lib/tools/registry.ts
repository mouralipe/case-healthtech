import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

export const toolRegistry = {
  getSchedule: {
    sensitive: false,
    description: "Returns available time slots in the clinic schedule for a given date (YYYY-MM-DD).",
    schema: z.object({ date: z.string() }),
  },
  getPatient: {
    sensitive: false,
    description: "Looks up a patient's information by their ID.",
    schema: z.object({ id: z.string() }),
  },
  bookAppointment: {
    sensitive: true, // modifies data → requires human approval
    description: "Books an appointment for a patient at a given time slot.",
    schema: z.object({ patientId: z.string(), slot: z.string() }),
  },
  sendFollowup: {
    sensitive: true, // sends a message → requires human approval
    description: "Sends a follow-up message to a patient.",
    schema: z.object({ patientId: z.string(), message: z.string() }),
  },
  searchFAQ: {
    sensitive: false,
    description: "Searches the clinic knowledge base (FAQ) for answers by keyword.",
    schema: z.object({ query: z.string() }),
  },
} as const;

export type ToolName = keyof typeof toolRegistry;

export function isSensitive(name: string): boolean {
  return (toolRegistry as Record<string, { sensitive: boolean }>)[name]?.sensitive ?? false;
}

export const anthropicTools: Anthropic.Tool[] = [
  {
    name: "getSchedule",
    description: toolRegistry.getSchedule.description,
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "Date in YYYY-MM-DD format" } },
      required: ["date"],
    },
  },
  {
    name: "getPatient",
    description: toolRegistry.getPatient.description,
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "bookAppointment",
    description: toolRegistry.bookAppointment.description,
    input_schema: {
      type: "object",
      properties: {
        patientId: { type: "string" },
        slot: { type: "string", description: "e.g. 2026-06-24T10:00" },
      },
      required: ["patientId", "slot"],
    },
  },
  {
    name: "sendFollowup",
    description: toolRegistry.sendFollowup.description,
    input_schema: {
      type: "object",
      properties: {
        patientId: { type: "string" },
        message: { type: "string" },
      },
      required: ["patientId", "message"],
    },
  },
  {
    name: "searchFAQ",
    description: toolRegistry.searchFAQ.description,
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Search term in English" } },
      required: ["query"],
    },
  },
];
