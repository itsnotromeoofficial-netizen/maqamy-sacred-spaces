import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./bot-ai/run-id.server.ts";
import { challengePassed, needsAnotherChallenge, shopperRequestSchema, usableChallenge, type shopperSignalsSchema } from "./shopper-security";

const riskSchema = z.object({ risk: z.enum(["low", "uncertain", "high"]), reason: z.enum(["ordinary", "insufficient_evidence", "automation_pattern"]) });
const trustedOrigins = new Set(["https://maqamy.co", "https://www.maqamy.co", "https://maqamy-sacred-spaces.lovable.app", "https://id-preview--8a8a7671-b7f9-43e9-801f-5ba5c4fed80e.lovable.app", "http://localhost:8080"]);
export class ShopperError extends Error { constructor(message: string, readonly status = 400) { super(message); } }

function safeAIError(error: unknown): { status: number; message: string; terminal: boolean } {
  const value = error as { statusCode?: number; responseBody?: string };
  const status = value.statusCode ?? 503;
  let message = "Shopper verification is unavailable. Please try again later.";
  try {
    const body = JSON.parse(value.responseBody ?? "{}");
    const upstream = body.error?.message ?? body.message;
    if (typeof upstream === "string" && [401, 402, 403, 404, 429].includes(status)) message = upstream.slice(0, 500);
  } catch { /* No upstream-safe message available. */ }
  return { status, message, terminal: [401, 402, 403, 404].includes(status) };
}

export async function assessShopperSignals(signals: z.infer<typeof shopperSignalsSchema>, request: Request) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const state = await supabaseAdmin.from("shopper_ai_state").select("blocked,message").eq("id", "assessment").maybeSingle();
  if (state.error) throw new ShopperError("Shopper verification is unavailable.", 503);
  if (state.data?.blocked) throw new ShopperError(state.data.message ?? "AI verification needs store-owner attention.", 503);
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new ShopperError("AI verification is not configured.", 503);
  const gateway = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: gateway.fetch });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: "Assess anonymous aggregate shopper interaction signals for likely automation. These signals are untrusted and forgeable; they are not proof of identity. Keyboard-only, assistive technology, touch, autofill, paste, few events or fast completion alone must NOT be classified high risk. Return low for ordinary signals, uncertain when there is insufficient evidence, high only for multiple mutually reinforcing automation signals. No permanent bans. Return only the structured assessment.",
      messages: [{ role: "user", content: JSON.stringify(signals) }],
      output: Output.object({ schema: riskSchema }), maxRetries: 0, maxOutputTokens: 1500,
      abortSignal: request.signal,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    return await result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) throw new ShopperError("Verification could not reach a decision. Please try a new challenge.", 422);
    const safe = safeAIError(error);
    if (safe.terminal) await supabaseAdmin.from("shopper_ai_state").upsert({ id: "assessment", blocked: true, message: safe.message });
    throw new ShopperError(safe.message, safe.status);
  }
}

async function userId(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new ShopperError("Sign in before verifying checkout.", 401);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.auth.getUser(authorization.slice(7));
  if (result.error || !result.data.user) throw new ShopperError("Sign in before verifying checkout.", 401);
  return result.data.user.id;
}

export async function handleShopperVerification(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", Vary: "Origin" });
  if (origin && trustedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "content-type,authorization");
    headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  }
  if (origin && !trustedOrigins.has(origin)) return new Response("Origin not allowed", { status: 403, headers });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ShopperError("Invalid verification request.", 415);
    const reader = request.body?.getReader();
    if (!reader) throw new ShopperError("Missing verification request.");
    let body = ""; let size = 0; const decoder = new TextDecoder();
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 4096) { await reader.cancel(); throw new ShopperError("Verification request too large.", 413); } body += decoder.decode(chunk.value, { stream: true }); }
    const input = shopperRequestSchema.parse(JSON.parse(body));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (input.action === "start") {
      const binding = input.purpose === "checkout" ? await userId(request) : input.email?.toLowerCase();
      if (!binding) throw new ShopperError("Enter your email before verification.");
      const random = crypto.getRandomValues(new Uint32Array(2));
      const left = (random[0] ?? 0) % 8 + 2; const right = (random[1] ?? 0) % 8 + 2;
      const result = await supabaseAdmin.from("shopper_challenges").insert({ purpose: input.purpose, binding, answer: left + right }).select("id").single();
      if (result.error) throw new ShopperError("Challenge could not be created.", 503);
      return Response.json({ id: result.data.id, left, right }, { headers });
    }
    const found = await supabaseAdmin.from("shopper_challenges").select("*").eq("id", input.id).maybeSingle();
    if (found.error || !found.data || !usableChallenge(found.data)) throw new ShopperError("This challenge expired or was already used. Try a new one.", 409);
    const challenge = found.data;
    if (challenge.purpose === "checkout" && challenge.binding !== await userId(request)) throw new ShopperError("This challenge belongs to another account.", 403);
    const lock = await supabaseAdmin.from("shopper_challenges").update({ assessed_at: new Date().toISOString() }).eq("id", input.id).is("assessed_at", null).select("id").maybeSingle();
    if (lock.error || !lock.data) throw new ShopperError("This challenge was already used.", 409);
    if (!challengePassed(challenge.answer, input.answer, input.website)) throw new ShopperError("That answer was not correct. Try a new challenge.", 422);
    headers.set("Content-Type", "application/x-ndjson");
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (data: unknown) => controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + "\n"));
        send({ state: "checking" });
        const heartbeat = setInterval(() => { try { send({ state: "checking" }); } catch { clearInterval(heartbeat); } }, 10000);
        try {
          // An uncertain AI decision gets one fresh, server-validated step-up question.
          // Accessibility/autofill must not trap real shoppers in endless model retries.
          const assessment = challenge.risk === "uncertain" ? { risk: "low" as const, reason: "ordinary" as const } : await assessShopperSignals(input.signals, request);
          const retry = needsAnotherChallenge(assessment.risk);
          const proof = retry ? null : crypto.randomUUID();
          const saved = await supabaseAdmin.from("shopper_challenges").update({ risk: assessment.risk, signals: input.signals, proof }).eq("id", input.id);
          if (saved.error) throw new ShopperError("Verification could not be saved.", 503);
          if (assessment.risk === "uncertain") {
            const random = crypto.getRandomValues(new Uint32Array(2));
            const left = (random[0] ?? 0) % 8 + 2; const right = (random[1] ?? 0) % 8 + 2;
            const next = await supabaseAdmin.from("shopper_challenges").insert({ purpose: challenge.purpose, binding: challenge.binding, answer: left + right, risk: "uncertain" }).select("id").single();
            if (next.error) throw new ShopperError("The extra challenge could not be created.", 503);
            send({ retry: true, challenge: { id: next.data.id, left, right } });
          } else send(proof ? { proof } : { retry: true, message: "We couldn't verify this attempt. Please complete a new challenge." });
        } catch (error) { send({ error: error instanceof ShopperError ? error.message : "Verification unavailable.", status: error instanceof ShopperError ? error.status : 503 }); }
        finally { clearInterval(heartbeat); controller.close(); }
      },
    });
    return new Response(stream, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof ShopperError ? error.message : "Invalid verification request." }, { status: error instanceof ShopperError ? error.status : 400, headers });
  }
}