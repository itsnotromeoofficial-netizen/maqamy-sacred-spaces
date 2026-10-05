import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";

import { actions, AdminError, login, rateLimit, verifyToken } from "@/lib/admin.server";

const ALLOWED = [/^https:\/\/(www\.)?maqamy\.co$/, /^https:\/\/[a-z0-9-]+\.lovable\.app$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/, /^http:\/\/localhost(:\d+)?$/];

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
        const headers = { ...cors(origin), "content-type": "application/json", "cache-control": "no-store" };
        const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
        if (origin && !ALLOWED.some((r) => r.test(origin))) return reply({ error: "Forbidden" }, 403);
        try {
          const ip = clientIp(request);
          await rateLimit("admin-api", ip, 60, 120); // 120 requests per minute per address
          const body = (await request.json().catch(() => ({}))) as { action?: string; data?: unknown };
          if (body.action === "login") return reply(await login(body.data, ip));
          const auth = request.headers.get("authorization");
          const claims = verifyToken(auth?.startsWith("Bearer ") ? auth.slice(7) : null);
          if (!claims) return reply({ error: "Your session has ended. Please sign in again.", code: "unauthorized" }, 401);
          const handler = body.action ? actions[body.action] : undefined;
          if (!handler) return reply({ error: "Unknown action." }, 400);
          return reply({ result: await handler(body.data, claims) });
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
