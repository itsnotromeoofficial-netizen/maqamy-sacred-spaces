import { describe, it as test } from "node:test";
import { strict as assert } from "node:assert";
import { typographyCss, typographySchema, typographyVariables } from "./typography";

describe("independent screen text sizes", () => {
  test("keeps desktop and mobile adjustments independent", () => {
    const settings = typographySchema.parse({ homeHeading: { mobile: 27, desktop: 45 } });
    assert.equal(typographyVariables(settings)["--type-homeHeading-mobile"], "27px");
    assert.equal(typographyVariables(settings)["--type-homeHeading-desktop"], "45px");
    assert.equal(typographyVariables(settings, "mobile")["--type-homeHeading-preview"], "27px");
  });
  test("reset removes overrides rather than replacing original responsive sizes", () => {
    assert.equal(typographyCss({ homeHeading: { mobile: null, desktop: null } }).includes("font-size:"), false);
  });
  test("rejects unsafe or unsupported settings", () => {
    assert.equal(typographySchema.safeParse({ heading: { mobile: 0, desktop: 36 } }).success, false);
    assert.equal(typographySchema.safeParse({ unknown: { mobile: 20, desktop: 20 } }).success, false);
    assert.equal(typographySchema.safeParse({ body: { mobile: "16px;display:none", desktop: 14 } }).success, false);
  });
});