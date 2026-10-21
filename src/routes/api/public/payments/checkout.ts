import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { allowedCheckoutOrigin, checkoutRequestSchema } from "@/lib/checkout-policy";

function headersFor(origin: string | null) {
  const headers: Record<string, string> = { "cache-control": "no-store", Vary: "Origin", "x-content-type-options": "nosniff" };
  if (origin && allowedCheckoutOrigin(origin)) Object.assign(headers, {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
  });
  return headers;
}

export const Route = createFileRoute("/api/public/payments/checkout")({
  server: { handlers: {
    OPTIONS: ({ request }) => new Response(null, { status: 204, headers: headersFor(request.headers.get("origin")) }),
    POST: async ({ request }) => {
      const origin = request.headers.get("origin");
      const headers = headersFor(origin);
      const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
      if (origin && !allowedCheckoutOrigin(origin)) return reply({ error: "Forbidden" }, 403);
      const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
      if (!token) return reply({ error: "Please sign in before paying." }, 401);
      try {
        const url = process.env['SUPABASE_URL'];
        const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
        if (!url || !key) return reply({ error: "Payment service is not configured. Please contact MAQAMY." }, 503);
        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => {
            const h = new Headers(init?.headers);
            if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          } },
        });
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return reply({ error: "Your session has ended. Please sign in again before paying." }, 401);
        if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Use a JSON request." }, 415);
        const reader = request.body?.getReader();
        if (!reader) return reply({ error: "Missing payment details." }, 400);
        let text = ""; let size = 0; const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 4096) { await reader.cancel(); return reply({ error: "Payment request is too large." }, 413); }
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
        let parsed: unknown;
        try { parsed = JSON.parse(text); } catch { return reply({ error: "Invalid payment details." }, 400); }
        const input = checkoutRequestSchema.safeParse(parsed);
        if (!input.success) return reply({ error: "Invalid payment details or return address." }, 400);
        const { checkoutForOrder } = await import("@/lib/checkout.server");
        const result = await checkoutForOrder(input.data, { supabase, userId: user.id });
        return reply(result, "error" in result ? 400 : 200);
      } catch {
        return reply({ error: "Payment service is temporarily unavailable. Please retry payment for this same order." }, 503);
      }
    },
  } },
});