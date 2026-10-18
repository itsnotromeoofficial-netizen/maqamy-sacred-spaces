import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

async function markOrderPaid(orderNumber: string, status: "paid" | "failed") {
  const { error } = await getSupabase()
    .from("orders")
    .update({ payment_status: status })
    .eq("order_number", orderNumber);
  if (error) console.error("Could not update payment status for", orderNumber, error.message);
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
        await markOrderPaid(orderNumber, "paid");
      }
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const orderNumber = session.metadata?.order_number as string | undefined;
      if (orderNumber) await markOrderPaid(orderNumber, "paid");
      break;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object;
      const orderNumber = session.metadata?.order_number as string | undefined;
      if (orderNumber) await markOrderPaid(orderNumber, "failed");
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
