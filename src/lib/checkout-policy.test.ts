import { describe, expect, it } from "bun:test";
import { allowedCheckoutOrigin, checkoutEndpoint, checkoutRequestSchema } from "./checkout-policy";

describe("checkout hosting and ownership input", () => {
  it("sends maqamy.co checkout to the hosted payment service", () => {
    expect(checkoutEndpoint("https://maqamy.co")).toBe("https://maqamy-sacred-spaces.lovable.app/api/public/payments/checkout");
  });
  it("keeps local checkout local for verification", () => {
    expect(checkoutEndpoint("http://localhost:8080")).toBe("http://localhost:8080/api/public/payments/checkout");
  });
  it("rejects browser-supplied customer ownership and prices", () => {
    expect(checkoutRequestSchema.safeParse({ orderNumber: "MQ-ABC12345", returnUrl: "https://maqamy.co/cart", environment: "live", userId: "other", total: 1 }).success).toBe(false);
  });
  it("does not allow untrusted origins", () => {
    expect(allowedCheckoutOrigin("https://evil.example")).toBe(false);
    expect(allowedCheckoutOrigin("https://maqamy.co")).toBe(true);
  });
});