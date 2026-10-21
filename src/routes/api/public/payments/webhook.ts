import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function markOrderPaid(session: { id: string; currency?: string | null; amount_total?: number | null; metadata?: Record<string, string> | null }, env: StripeEnv, status: "paid" | "failed") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error: readError } = await supabaseAdmin.from("orders").select("id, total, payment_amount, user_id").eq("payment_session_id", session.id).eq("payment_environment", env).maybeSingle();
  if (readError) throw new Error("Payment binding could not be read.");
  if (!order || session.metadata?.order_id !== order.id || session.metadata?.userId !== order.user_id) throw new Error("Payment does not match an order.");
  if (status === "paid" && (session.currency !== "myr" || session.amount_total == null || session.amount_total < (order.payment_amount ?? order.total * 100))) throw new Error("Payment amount does not match.");
  const { error } = await supabaseAdmin
    .from("orders")
    .update({ payment_status: status })
    .eq("id", order.id).neq("payment_status", "paid");
  if (error) throw new Error("Payment status could not be saved.");
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderNumber = session.metadata?.order_number as string | undefined;
      if (!orderNumber) break;
      // "unpaid" means a delayed payment method was submitted but not settled
      // yet; async_payment_succeeded confirms it later.
      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        await markOrderPaid(session, env, "paid");
      }
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const orderNumber = session.metadata?.order_number as string | undefined;
      if (orderNumber) await markOrderPaid(session, env, "paid");
      break;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object;
      const orderNumber = session.metadata?.order_number as string | undefined;
      if (orderNumber) await markOrderPaid(session, env, "failed");
      break;
    }
    default:
      console.log("Unhandled payment event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid or missing env query parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
