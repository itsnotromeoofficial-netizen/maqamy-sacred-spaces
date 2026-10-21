import { createFileRoute } from "@tanstack/react-router";
import { z, ZodError } from "zod";

import { AdminError, currentAdminClaims, login, rateLimit, runAdminAction, verifyToken } from "@/lib/admin.server";

const ALLOWED = [/^https:\/\/(www\.)?maqamy\.co$/, /^https:\/\/maqamy-sacred-spaces\.lovable\.app$/, /^https:\/\/id-preview--8a8a7671-b7f9-43e9-801f-5ba5c4fed80e\.lovable\.app$/, /^http:\/\/localhost(:\d+)?$/];
const requestSchema = z.object({ action: z.string().regex(/^[A-Za-z]+$/).max(40), data: z.unknown().optional() }).strict();

async function boundedJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new AdminError("Use a JSON request.", 415);
  // Upload action retains the existing 100MB file ceiling; ordinary actions are much smaller.
  const maximum = 141_000_000;
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError("Request body missing.");
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) { await reader.cancel(); throw new AdminError("Request is too large.", 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AdminError("Invalid JSON request."); }
  const body = requestSchema.parse(parsed);
  if (body.action !== "uploadBanner" && size > 64_000) throw new AdminError("Request is too large.", 413);
  return body;
}

function cors(origin: string | null): Record<string, string> {
  const ok = origin && ALLOWED.some((r) => r.test(origin));
  return ok ? {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  } : { Vary: "Origin" };
}

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const Route = createFileRoute("/api/public/admin")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => new Response(null, { status: 204, headers: cors(request.headers.get("origin")) }),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        const headers = { ...cors(origin), "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
        const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
        if (origin && !ALLOWED.some((r) => r.test(origin))) return reply({ error: "Forbidden" }, 403);
        try {
          const ip = clientIp(request);
          await rateLimit("admin-api", ip, 60, 120); // 120 requests per minute per address
          const body = await boundedJson(request);
          if (body.action === "login") return reply(await login(body.data, ip));
          const auth = request.headers.get("authorization");
          const verified = verifyToken(auth?.startsWith("Bearer ") ? auth.slice(7) : null);
          const claims = verified ? await currentAdminClaims(verified) : null;
          if (!claims) return reply({ error: "Your session has ended. Please sign in again.", code: "unauthorized" }, 401);
          return reply({ result: await runAdminAction(body.action, body.data, claims) });
        } catch (e) {
          if (e instanceof AdminError) return reply({ error: e.message }, e.status);
          if (e instanceof ZodError) return reply({ error: e.issues[0]?.message ?? "Invalid details." }, 400);
          console.error(e);
          return reply({ error: "Something went wrong. Please try again." }, 500);
        }
      },
    },
  },
});
