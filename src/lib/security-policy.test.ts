import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { adminClaimsSchema, canAdminPerform, safeMediaUrl, safeReturnUrl } from "./security-policy";
const claims = { u: "test", team: "Delivery Team", master: false, exp: 2000000000000 };
describe("admin access controls", () => {
  it("delivery cannot read all customers or mutate products", () => {
    assert.equal(canAdminPerform("deleteCustomer", claims), false);
    assert.equal(canAdminPerform("listCustomers", claims), false);
    assert.equal(canAdminPerform("saveProduct", claims), false);
    assert.equal(canAdminPerform("listOrders", claims), true);
  });
  it("sales cannot ban customers or approve orders", () => {
    assert.equal(canAdminPerform("banCustomer", { ...claims, team: "Sales Team" }), false);
    assert.equal(canAdminPerform("approveOrder", { ...claims, team: "Sales Team" }), false);
  });
  it("unknown teams do not inherit sales permissions", () => {
    assert.equal(canAdminPerform("listCustomers", { ...claims, team: "Custom" }), false);
  });
  it("token role types are strictly checked", () => {
    assert.equal(adminClaimsSchema.safeParse({ ...claims, master: "true" }).success, false);
  });
  it("media rejects executable and insecure URLs", () => {
    assert.equal(safeMediaUrl.safeParse("javascript:alert(1)").success, false);
    assert.equal(safeMediaUrl.safeParse("http://example.com/test.jpg").success, false);
    assert.equal(safeMediaUrl.safeParse("https://example.com/test.mp4").success, true);
  });
  it("checkout only returns to the trusted cart page", () => {
    assert.equal(safeReturnUrl("https://maqamy.co/cart?order=MQ-12345678"), true);
    assert.equal(safeReturnUrl("https://attacker.vercel.app/cart"), false);
    assert.equal(safeReturnUrl("https://maqamy.co.evil.test/cart"), false);
  });
});