import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { allowedCheckoutOrigin, checkoutEndpoint, checkoutRequestSchema } from "./checkout-policy";

describe("checkout hosting and ownership input", () => {
  it("sends maqamy.co checkout to the hosted payment service", () => {
    assert.equal(checkoutEndpoint("https://maqamy.co"), "https://maqamy-sacred-spaces.lovable.app/api/public/payments/checkout");
  });
  it("keeps local checkout local for verification", () => {
    assert.equal(checkoutEndpoint("http://localhost:8080"), "http://localhost:8080/api/public/payments/checkout");
  });
  it("rejects browser-supplied customer ownership and prices", () => {
    assert.equal(checkoutRequestSchema.safeParse({ orderNumber: "MQ-ABC12345", returnUrl: "https://maqamy.co/cart", environment: "live", userId: "other", total: 1 }).success, false);
  });
  it("does not allow untrusted origins", () => {
    assert.equal(allowedCheckoutOrigin("https://evil.example"), false);
    assert.equal(allowedCheckoutOrigin("https://maqamy.co"), true);
  });
});