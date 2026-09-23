/**
 * Canonical public address of the MAQAMY storefront.
 * Verification and password-reset emails always point here, never at a
 * preview or hosting-provider URL.
 */
export const SITE_URL = "https://maqamy.co";

export function siteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
