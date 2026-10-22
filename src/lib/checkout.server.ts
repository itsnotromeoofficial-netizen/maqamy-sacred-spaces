import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { z } from "zod";
import { type CheckoutRequest } from "./checkout-policy";

const orderItemSchema = z.object({ collection: z.string().min(1).max(60), package: z.string().min(1).max(60), quantity: z.number().int().min(1).max(10), unit_price: z.number().int().nonnegative() });

type CheckoutSessionResult =
  | { clientSecret: string; orderNumber: string }
  | { error: string };

// Cart items map to the payment catalog ids created at enable time. New
// admin-created products must follow the same slug to be purchasable online.
function priceIdFor(collection: string, packageName: string): string {
  return `${collection.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${packageName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_oneoff`;
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    const matched = found.data[0];
    if (matched) return matched.id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.['userId'] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, ['userId']: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export async function checkoutForOrder(data: CheckoutRequest, context: { supabase: SupabaseClient<Database>; userId: string }): Promise<CheckoutSessionResult> {
    try {
      const { supabase, userId } = context;
      const { data: { user } } = await supabase.auth.getUser();

      const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("order_number", data.orderNumber).eq("user_id", userId).maybeSingle();
      if (orderError || !order) throw new Error("Order not found.");
      if (order.payment_status === "paid" || order.status === "rejected") throw new Error("This order is not eligible for payment.");
      if (order.payment_environment && order.payment_environment !== data.environment) throw new Error("This order already has a payment in another environment.");
      // place_order clears the cart; checkout must use the immutable order snapshot.
      const cartItems = z.array(orderItemSchema).min(1).max(100).parse(order.items);

      const priceIds = [...new Set(cartItems.map((item) => priceIdFor(item.collection, item.package)))];
      const stripe = createStripeClient(data.environment);
      // Reuse a bound open session; never create a second payable session on retry.
      if (order.payment_session_id) {
        const existing = await stripe.checkout.sessions.retrieve(order.payment_session_id);
        if (existing.status === "open" && existing.client_secret) return { clientSecret: existing.client_secret, orderNumber: data.orderNumber };
        throw new Error("This payment session is no longer open. Please contact MAQAMY before paying again.");
      }
      const priceList = await stripe.prices.list({ lookup_keys: priceIds, limit: 100 });
      const priceByLookup = new Map(priceList.data.map((price) => [price.lookup_key, price]));

      // Products added through the admin panel have no Stripe price yet.
      // Create it on demand, bound to the order's locked-in snapshot price,
      // reusing the same lookup key so future orders share it.
      for (const item of cartItems) {
        const lookupKey = priceIdFor(item.collection, item.package);
        if (priceByLookup.has(lookupKey)) continue;
        try {
          const product = await stripe.products.create({ name: `${item.collection} ${item.package} edition` });
          const price = await stripe.prices.create({
            product: product.id,
            currency: "myr",
            unit_amount: item.unit_price * 100,
            lookup_key: lookupKey,
          });
          priceByLookup.set(lookupKey, price);
        } catch {
          // A concurrent checkout may have created the price first; re-read it.
          const refreshed = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
          const existing = refreshed.data[0];
          if (!existing) throw new Error("One or more items in your cart are not available for online payment. Please contact us.");
          priceByLookup.set(lookupKey, existing);
        }
      }

      const lineItems = cartItems.map((item) => {
        const price = priceByLookup.get(priceIdFor(item.collection, item.package));
        if (!price || price.currency !== "myr" || price.unit_amount !== item.unit_price * 100) throw new Error("This order's price needs review before payment. Please contact MAQAMY.");
        return { price: price.id, quantity: item.quantity };
      });

      const customerId = await resolveOrCreateCustomer(stripe, {
        ...(user?.email ? { email: user.email } : {}),
        userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: { description: `MAQAMY order ${data.orderNumber}` },
        metadata: { userId, order_id: order.id, order_number: data.orderNumber, managed_payments: "false" },
      }, {
        // A new payload version avoids Stripe replaying the previous unsupported-tax error.
        idempotencyKey: `maqamy-${order.id}-${data.environment}-tax-unavailable`,
      });

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const binding = await supabaseAdmin.from("orders").update({ payment_session_id: session.id, payment_environment: data.environment, payment_amount: order.total * 100 }).eq("id", order.id).eq("user_id", userId);
      if (binding.error) throw new Error("Payment could not be attached to your order.");

      return { clientSecret: session.client_secret ?? "", orderNumber: data.orderNumber };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
}
