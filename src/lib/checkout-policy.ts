import { z } from "zod";
import { safeReturnUrl } from "./security-policy";

export const checkoutRequestSchema = z.object({
  orderNumber: z.string().regex(/^MQ-[A-Z0-9]{6,12}$/),
  returnUrl: z.string().max(2000).refine(safeReturnUrl, "Invalid payment return address"),
  environment: z.enum(["sandbox", "live"]),
}).strict();
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export function checkoutEndpoint(origin: string) {
  const url = new URL(origin);
  // Preview hosts have a separate editor authorization gate that rejects shopper
  // bearer tokens before our handler. Use the public hosted service everywhere
  // except localhost, where the handler can be tested directly.
  const local = url.hostname === "localhost";
  return `${local ? url.origin : "https://maqamy-sacred-spaces.lovable.app"}/api/public/payments/checkout`;
}

export function allowedCheckoutOrigin(origin: string) {
  return safeReturnUrl(`${origin}/cart`);
}