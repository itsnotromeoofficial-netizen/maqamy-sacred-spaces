import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { challengePassed, needsAnotherChallenge, shopperSignalsSchema, usableChallenge } from "./shopper-security";
describe("shopper proof security", () => {
  it("rejects wrong challenge answers", () => { assert.equal(challengePassed(12, 11, ""), false); assert.equal(challengePassed(12, 12, ""), true); });
  it("rejects filled bot traps even with a correct answer", () => { assert.equal(challengePassed(12, 12, "spam"), false); });
  it("expires after the server deadline", () => { assert.equal(usableChallenge({ expires_at: new Date(1000).toISOString(), assessed_at: null, consumed_at: null }, 1001), false); });
  it("rejects replay of an assessed challenge", () => { assert.equal(usableChallenge({ expires_at: new Date(3000).toISOString(), assessed_at: new Date(500).toISOString(), consumed_at: null }, 1000), false); });
  it("uncertain and likely bot decisions require another challenge", () => { assert.equal(needsAnotherChallenge("uncertain"), true); assert.equal(needsAnotherChallenge("high"), true); assert.equal(needsAnotherChallenge("low"), false); });
  it("does not accept personal data in model signals", () => { assert.equal(shopperSignalsSchema.safeParse({ elapsedMs: 100, pointerEvents: 1, keyEvents: 1, focusEvents: 1, pasteEvents: 0, webdriver: false, email: "private@example.com" }).success, false); });
});