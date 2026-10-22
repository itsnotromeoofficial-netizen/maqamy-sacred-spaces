import type { Tables } from "@/integrations/supabase/types";
import type { OrderStatus } from "./orders";
import type { TypographySettings } from "./typography";
import { typographySchema } from "./typography";
import { supabase } from "@/integrations/supabase/client";

/**
 * Browser client for the admin endpoint. The endpoint always lives on the
 * Lovable-hosted app (it holds the backend service key), so any other host —
 * e.g. maqamy.co on Vercel — calls it cross-origin with a bearer token.
 */
const BACKEND_ORIGIN = "https://maqamy-sacred-spaces.lovable.app";
const TOKEN_KEY = "maqamy-admin-token";
const TIMEOUT_MS = 15_000;

function endpoint() {
  const host = window.location.hostname;
  const local = host === "localhost" || host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
  return `${local ? "" : BACKEND_ORIGIN}/api/public/admin`;
}

const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } };
const setToken = (t: string | null) => { try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } };

export class AdminApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call<T>(action: string, data?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(endpoint(), {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action, data }),
      signal: controller.signal,
      credentials: "omit",
    });
  } catch {
    throw new AdminApiError("Could not reach the server. Check your connection and try again.", 0);
  } finally { window.clearTimeout(timer); }
  const body = (await res.json().catch(() => ({}))) as { result?: T; error?: string; token?: string; session?: unknown };
  if (res.status === 401 && action !== "login") setToken(null);
  if (!res.ok) throw new AdminApiError(body.error ?? "Something went wrong.", res.status);
  return (action === "login" ? body : body.result) as T;
}

export type AdminSession = { authenticated: boolean; username: string; team: string; master: boolean };
const signedOut: AdminSession = { authenticated: false, username: "", team: "", master: false };
export const getAdminTypography = async () => {
  try { return await call<TypographySettings>("getTypography"); }
  catch (error) {
    // Typography is public read-only data. Older published admin services lack this action.
    if (!(error instanceof AdminApiError) || error.status !== 400 || error.message !== "Unknown action.") throw error;
    const result = await supabase.from("typography_settings").select("settings").eq("id", "website").maybeSingle();
    if (result.error) throw new Error("Text sizes could not be loaded. Please try again.");
    return typographySchema.parse(result.data?.settings ?? {});
  }
};
export const saveAdminTypography = (settings: TypographySettings) => call<TypographySettings>("saveTypography", settings);

export async function getAdminSession(): Promise<AdminSession> {
  if (!getToken()) return signedOut;
  try { return await call<AdminSession>("session"); }
  catch (e) { if (e instanceof AdminApiError && e.status === 401) return signedOut; throw e; }
}
export async function loginAdmin({ data }: { data: { username: string; password: string; website?: string } }) {
  const r = await call<{ token: string; session: AdminSession }>("login", data);
  setToken(r.token);
  return r.session;
}
export async function logoutAdmin() { setToken(null); }

type Product = Tables<"products">;
type Order = Tables<"orders">;
type D<T> = { data: T };

export const listAdminProducts = () => call<Product[]>("listProducts");
export const saveAdminProduct = ({ data }: D<Record<string, unknown>>) => call<Product>("saveProduct", data);
export const adjustAdminStock = ({ data }: D<{ id: string; change: number }>) => call<{ stock: number }>("adjustStock", data);
export const setAdminStock = ({ data }: D<{ id: string; stock: number }>) => call<{ stock: number }>("setStock", data);
export const deleteAdminProduct = ({ data }: D<{ id: string }>) => call("deleteProduct", data);
export type AdminOrder = Order & { assigned_username: string | null };
export const listAdminOrders = () => call<AdminOrder[]>("listOrders");
export const updateOrderStatus = ({ data }: D<{ id: string; status: OrderStatus }>) => call("updateOrderStatus", data);
export type DeliveryMember = { id: string; username: string };
export const listDeliveryTeam = () => call<DeliveryMember[]>("listDeliveryTeam");
export const approveOrder = ({ data }: D<{ id: string; assign_to: string }>) => call<{ ok: true; invoice_number: string; assigned_to: string }>("approveOrder", data);
export const deleteAdminOrder = ({ data }: D<{ id: string }>) => call("deleteOrder", data);
export type AdminInvoice = Tables<"invoices">;
export const listAdminInvoices = () => call<AdminInvoice[]>("listInvoices");
export const searchInvoices = ({ data }: D<{ order_number: string }>) => call<AdminInvoice[]>("searchInvoice", data);
export type AdminCustomer = Tables<"profiles"> & { banned_until: string | null; orders: number };
export const listAdminCustomers = () => call<AdminCustomer[]>("listCustomers");
export const banCustomer = ({ data }: D<{ id: string; duration: "30d" | "permanent" | "none" }>) => call("banCustomer", data);
export const deleteCustomer = ({ data }: D<{ id: string }>) => call("deleteCustomer", data);
export type AdminAccount = { id: string; username: string; team: string; created_at: string };
export const listAdminAccounts = () => call<AdminAccount[]>("listAdmins");
export const createAdminAccount = ({ data }: D<{ username: string; team: string; password: string }>) => call("createAdmin", data);
export const deleteAdminAccount = ({ data }: D<{ id: string }>) => call("deleteAdmin", data);
export type AdminBanner = Tables<"banners">;
export const listAdminBanners = () => call<AdminBanner[]>("listBanners");
export const saveAdminBanner = ({ data }: D<Record<string, unknown>>) => call<AdminBanner>("saveBanner", data);
export const deleteAdminBanner = ({ data }: D<{ id: string }>) => call("deleteBanner", data);
export const uploadAdminBanner = ({ data }: D<{ kind: "image" | "video"; filename: string; content_type: string; base64: string }>) => call<{ url: string }>("uploadBanner", data);
