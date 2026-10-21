import { describe, expect, test } from "bun:test";
import { typographyCss, typographySchema, typographyVariables } from "./typography";

describe("independent screen text sizes", () => {
  test("keeps desktop and mobile adjustments independent", () => {
    const settings = typographySchema.parse({ homeHeading: { mobile: 27, desktop: 45 } });
    expect(typographyVariables(settings)["--type-homeHeading-mobile"]).toBe("27px");
    expect(typographyVariables(settings)["--type-homeHeading-desktop"]).toBe("45px");
    expect(typographyVariables(settings, "mobile")["--type-homeHeading-preview"]).toBe("27px");
  });
  test("reset removes overrides rather than replacing original responsive sizes", () => {
    expect(typographyCss({ homeHeading: { mobile: null, desktop: null } })).not.toContain("font-size:");
  });
  test("rejects unsafe or unsupported settings", () => {
    expect(typographySchema.safeParse({ heading: { mobile: 0, desktop: 36 } }).success).toBe(false);
    expect(typographySchema.safeParse({ unknown: { mobile: 20, desktop: 20 } }).success).toBe(false);
    expect(typographySchema.safeParse({ body: { mobile: "16px;display:none", desktop: 14 } }).success).toBe(false);
  });
});