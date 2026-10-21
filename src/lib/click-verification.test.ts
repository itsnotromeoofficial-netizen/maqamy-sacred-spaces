import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { clickVerificationPassed } from "./click-verification";
describe("click verification", () => {
  it("passes after the shopper clicks", () => assert.equal(clickVerificationPassed(true), true));
  it("does not pass before the shopper clicks", () => assert.equal(clickVerificationPassed(false), false));
});