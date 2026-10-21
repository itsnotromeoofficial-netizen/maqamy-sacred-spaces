import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkoutRequestSchema } from "@/lib/checkout-policy";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(checkoutRequestSchema)
  .handler(async ({ data, context }) => {
    const { checkoutForOrder } = await import("@/lib/checkout.server");
    return checkoutForOrder(data, context);
  });