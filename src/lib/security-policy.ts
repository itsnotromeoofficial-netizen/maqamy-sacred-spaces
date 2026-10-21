import { z } from "zod";

export const adminClaimsSchema = z.object({
  u: z.string().min(1).max(100), team: z.string().min(1).max(60),
  master: z.boolean(), exp: z.number().int().positive(),
  accountId: z.string().uuid().optional(),
}).strict();
export type AdminClaims = z.infer<typeof adminClaimsSchema>;

const ownerActions = new Set([
  "listAdmins", "createAdmin", "deleteAdmin", "listInvoices", "searchInvoice",
  "approveOrder", "banCustomer", "deleteCustomer", "saveBanner", "deleteBanner",
  "uploadBanner", "getTypography", "saveTypography",
]);
const salesActions = new Set(["session", "listProducts", "saveProduct", "adjustStock", "setStock", "deleteProduct", "listCustomers", "listOrders", "listDeliveryTeam", "listBanners"]);
const deliveryActions = new Set(["session", "listOrders", "updateOrderStatus"]);

export function canAdminPerform(action: string, claims: AdminClaims) {
  if (claims.master) return true;
  if (ownerActions.has(action)) return false;
  if (claims.team === "Delivery Team") return deliveryActions.has(action);
  if (claims.team === "Sales Team") return salesActions.has(action);
  return action === "session";
}

export const safeMediaUrl = z.string().url().max(2000).refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use a direct HTTPS image or video URL.");

export function safeReturnUrl(value: string) {
  try {
    const url = new URL(value);
    const trusted = url.origin === "https://maqamy.co" || url.origin === "https://www.maqamy.co" || url.origin === "https://maqamy-sacred-spaces.lovable.app" || /^https:\/\/id-preview--8a8a7671-b7f9-43e9-801f-5ba5c4fed80e\.lovable\.app$/.test(url.origin) || url.origin === "http://localhost:8080";
    return trusted && url.pathname === "/cart" && !url.username && !url.password;
  } catch { return false; }
}