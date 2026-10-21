import { supabase } from "@/integrations/supabase/client";
import { checkoutEndpoint, checkoutRequestSchema, type CheckoutRequest } from "./checkout-policy";

export async function requestCheckout(input: CheckoutRequest): Promise<string> {
  const data = checkoutRequestSchema.parse(input);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 45_000);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Your session has ended. Please sign in again before paying.");
    const response = await fetch(checkoutEndpoint(window.location.origin), {
      method: "POST", credentials: "omit", signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => null) as { clientSecret?: string; error?: string } | null;
    if (body?.error) throw new Error(body.error);
    if (!response.ok || !body?.clientSecret) throw new Error("Payment could not start. Please try again; if this continues, contact MAQAMY.");
    return body.clientSecret;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Payment took too long to respond. Please retry payment for this same order.");
    if (error instanceof TypeError) throw new Error("Could not reach the payment service. Check your connection and try again.");
    throw error;
  } finally { window.clearTimeout(timer); }
}