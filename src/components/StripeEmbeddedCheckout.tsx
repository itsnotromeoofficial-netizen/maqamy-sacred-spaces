import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";

interface StripeEmbeddedCheckoutProps {
  fetchClientSecret: () => Promise<string>;
}

export function StripeEmbeddedCheckout({ fetchClientSecret }: StripeEmbeddedCheckoutProps) {
  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
