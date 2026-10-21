import { z } from "zod";

export const shopperSignalsSchema = z.object({
  elapsedMs: z.number().int().min(0).max(3600000),
  pointerEvents: z.number().int().min(0).max(10000),
  keyEvents: z.number().int().min(0).max(10000),
  focusEvents: z.number().int().min(0).max(10000),
  pasteEvents: z.number().int().min(0).max(10000),
  webdriver: z.boolean(),
}).strict();
export const shopperRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), purpose: z.enum(["signup", "checkout"]), email: z.string().trim().email().max(255).optional() }).strict(),
  z.object({ action: z.literal("assess"), id: z.string().uuid(), answer: z.number().int().min(0).max(100), signals: shopperSignalsSchema, website: z.string().max(100).default("") }).strict(),
]);
export function usableChallenge(row: { expires_at: string; assessed_at: string | null; consumed_at: string | null }, now = Date.now()) {
  return Date.parse(row.expires_at) > now && !row.assessed_at && !row.consumed_at;
}
export function challengePassed(expected: number, answer: number, website: string) {
  return expected === answer && website === "";
}
export function needsAnotherChallenge(risk: "low" | "uncertain" | "high") {
  return risk !== "low";
}