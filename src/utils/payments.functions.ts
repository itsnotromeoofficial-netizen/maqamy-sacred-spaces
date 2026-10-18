import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

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
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
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

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderNumber: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^MQ-[A-Z0-9]{6,12}$/.test(data.orderNumber)) throw new Error("Invalid order");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const { supabase, userId } = context;
      const { data: { user } } = await supabase.auth.getUser();

      const { data: cartItems, error: cartError } = await supabase
        .from("cart_items")
        .select("collection, package, quantity")
        .eq("user_id", userId);
      if (cartError || !cartItems?.length) throw new Error("Your cart is empty.");

      const priceIds = [...new Set(cartItems.map((item) => priceIdFor(item.collection, item.package)))];
      const stripe = createStripeClient(data.environment);
      const priceList = await stripe.prices.list({ lookup_keys: priceIds, limit: 100 });
      const priceByLookup = new Map(priceList.data.map((price) => [price.lookup_key, price]));

      const missing = priceIds.filter((id) => !priceByLookup.has(id));
      if (missing.length) {
        throw new Error("One or more items in your cart are not available for online payment. Please contact us.");
      }

      const lineItems = cartItems.map((item) => ({
        price: priceByLookup.get(priceIdFor(item.collection, item.package))!.id,
        quantity: Math.min(Math.max(item.quantity, 1), 10),
      }));

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        automatic_tax: { enabled: true },
        payment_intent_data: { description: `MAQAMY order ${data.orderNumber}` },
        metadata: { userId, order_number: data.orderNumber, managed_payments: "false" },
      });

      return { clientSecret: session.client_secret ?? "", orderNumber: data.orderNumber };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
