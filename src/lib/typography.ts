import { z } from "zod";

export const typographyRoles = [
  { key: "heading", label: "Page & section headings", mobile: 30, desktop: 36 },
  { key: "body", label: "Descriptions & body text", mobile: 14, desktop: 14 },
  { key: "label", label: "Small labels & captions", mobile: 10, desktop: 12 },
  { key: "control", label: "Buttons & form text", mobile: 14, desktop: 14 },
  { key: "homeHeading", label: "Home headline", mobile: 30, desktop: 48 },
  { key: "homeQuote", label: "Home supporting quote", mobile: 12, desktop: 14 },
  { key: "storyBody", label: "Highlighted brand story", mobile: 18, desktop: 24 },
  { key: "productCard", label: "Product names in grid", mobile: 16, desktop: 20 },
  { key: "productDetail", label: "Expanded product name", mobile: 30, desktop: 36 },
  { key: "price", label: "Prices & totals", mobile: 24, desktop: 24 },
  { key: "banner", label: "Banner titles", mobile: 14, desktop: 14 },
  { key: "navigation", label: "Header navigation", mobile: 14, desktop: 12 },
  { key: "footer", label: "Footer text", mobile: 14, desktop: 14 },
  { key: "accountHeading", label: "Account headings", mobile: 24, desktop: 30 },
] as const;

export type TypographyRole = typeof typographyRoles[number]["key"];
export type TypographyDevice = "mobile" | "desktop";
const size = z.number().int().min(8).max(96).nullable();
const pair = z.object({ mobile: size, desktop: size }).strict();
export const typographySchema = z.record(z.enum(typographyRoles.map((r) => r.key) as [TypographyRole, ...TypographyRole[]]), pair);
export type TypographySettings = z.infer<typeof typographySchema>;

export function typographyVariables(settings: TypographySettings, device?: TypographyDevice) {
  const result: Record<string, string> = {};
  for (const role of typographyRoles) {
    for (const mode of ["mobile", "desktop"] as const) {
      if (device && mode !== device) continue;
      const value = settings[role.key]?.[mode];
      if (value != null) result[`--type-${role.key}-${device ? "preview" : mode}`] = `${value}px`;
      else if (device === mode) result[`--type-${role.key}-preview`] = `${role[mode]}px`;
      if (device === mode && value != null) result[`--type-${role.key}-preview`] = `${value}px`;
    }
  }
  return result;
}

export function typographyCss(settings: TypographySettings) {
  return (["mobile", "desktop"] as const).map((device) => {
    const rules = typographyRoles.flatMap(({ key }) => {
      const value = settings[key]?.[device];
      const selectors = key === "control" ? ".website-typography button, .website-typography input, .website-typography textarea, .website-typography select, .website-typography [data-slot=button], .website-typography label" : key === "navigation" ? ".website-typography header nav, .website-typography header a, .website-typography header button" : key === "footer" ? ".website-typography footer, .website-typography footer a, .website-typography footer p" : `.website-typography .type-${key}`;
      return value == null ? [] : [`${selectors} { font-size: ${value}px !important; overflow-wrap: anywhere; line-height: ${key === "heading" || key.includes("Heading") || key.startsWith("product") ? "1.2" : "1.6"}; }`];
    }).join("\n");
    return `@media (${device === "mobile" ? "max-width: 1023px" : "min-width: 1024px"}) { ${rules} }`;
  }).join("\n") + "\n.website-typography button, .website-typography [data-slot=button] { white-space: normal; height: auto; min-height: 2.5rem; }";
}