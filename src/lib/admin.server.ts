import { createHash, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { ORDER_STATUSES } from "./orders";

/**
 * Admin back office. Runs only on the Lovable-hosted server (it needs the
 * service key), and is reached over a token-authenticated HTTP endpoint so the
 * admin page works from any host (maqamy.co on Vercel included).
 */

export class AdminError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

type Claims = { u: string; team: string; master: boolean; exp: number };
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function secret() {
  const s = process.env["MAQAMY_ADMIN_SESSION_SECRET"];
  if (!s) throw new AdminError("Admin is not configured.", 500);
  return s;
}
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function issueToken(c: Omit<Claims, "exp">) {
  const body = b64(JSON.stringify({ ...c, exp: Date.now() + TOKEN_TTL_MS }));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | null): Claims | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig); const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Claims;
    return c.exp > Date.now() ? c : null;
  } catch { return null; }
}

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}
function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex")}`;
}
function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = pbkdf2Sync(password, salt, 100_000, 32, "sha256");
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ---------- Rate limiting ---------- */

export async function rateLimit(bucket: string, key: string, windowSeconds: number, max: number) {
  const { data, error } = await (await db()).rpc("rate_limit_hit", { _bucket: bucket, _key: key, _window_seconds: windowSeconds, _max: max });
  if (error) return; // never lock admins out because the limiter itself failed
  if (data === false) throw new AdminError("Too many attempts. Please wait a few minutes and try again.", 429);
}

/* ---------- Login (brute-force protected) ---------- */

const FAIL_WINDOW = 15 * 60;
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_PER_USER = 10;

export async function login(input: unknown, ip: string) {
  const data = z.object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(200) }).parse(input);
  const client = await db();
  const user = data.username.toLowerCase();
  const [ipFails, userFails] = await Promise.all([
    client.rpc("rate_limit_count", { _bucket: "admin-fail-ip", _key: ip, _window_seconds: FAIL_WINDOW }),
    client.rpc("rate_limit_count", { _bucket: "admin-fail-user", _key: user, _window_seconds: FAIL_WINDOW }),
  ]);
  if ((ipFails.data ?? 0) >= MAX_FAILS_PER_IP || (userFails.data ?? 0) >= MAX_FAILS_PER_USER) {
    throw new AdminError("Too many failed attempts. Sign-in is locked for 15 minutes.", 429);
  }

  let claims: Omit<Claims, "exp"> | null = null;
  const ownerUser = process.env["MAQAMY_ADMIN_USERNAME"];
  const ownerPass = process.env["MAQAMY_ADMIN_PASSWORD"];
  if (ownerUser && ownerPass && matches(data.username, ownerUser) && matches(data.password, ownerPass)) {
    claims = { u: ownerUser, team: "Owner", master: true };
  } else {
    const { data: account } = await client.from("admin_accounts").select("username, team, password_hash").eq("username", data.username).maybeSingle();
    if (account && verifyPassword(data.password, account.password_hash)) claims = { u: account.username, team: account.team, master: false };
  }

  if (!claims) {
    await Promise.all([
      client.rpc("rate_limit_hit", { _bucket: "admin-fail-ip", _key: ip, _window_seconds: FAIL_WINDOW, _max: 1000 }),
      client.rpc("rate_limit_hit", { _bucket: "admin-fail-user", _key: user, _window_seconds: FAIL_WINDOW, _max: 1000 }),
    ]);
    const left = MAX_FAILS_PER_IP - (ipFails.data ?? 0) - 1;
    throw new AdminError(left > 0 ? `Those details were not recognised. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many failed attempts. Sign-in is locked for 15 minutes.", left > 0 ? 401 : 429);
  }
  await client.rpc("rate_limit_clear", { _bucket: "admin-fail-ip", _key: ip });
  return { token: issueToken(claims), session: { authenticated: true, username: claims.u, team: claims.team, master: claims.master } };
}

/* ---------- Actions ---------- */

const list = z.array(z.string().trim().min(1).max(180)).max(30);
const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  collection: z.string().trim().min(2).max(60),
  package: z.string().trim().min(1).max(60),
  description: z.string().trim().max(1000),
  specifications: list, features: list, colours: list, varieties: list,
  price: z.number().int().min(0).max(10_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  image_url: z.string().url().max(1000).nullable().or(z.literal("")),
  display_order: z.number().int().min(0).max(100_000),
});
const idOnly = z.object({ id: z.string().uuid() });

type Handler = (input: unknown, c: Claims) => Promise<unknown>;

const master = (c: Claims) => { if (!c.master) throw new AdminError("Only the owner account can manage admins.", 403); };

export const actions: Record<string, Handler> = {
  session: async (_i, c) => ({ authenticated: true, username: c.u, team: c.team, master: c.master }),

  listProducts: async () => {
    const { data, error } = await (await db()).from("products").select("*").order("display_order");
    if (error) throw new AdminError("Products could not be loaded");
    return data;
  },
  saveProduct: async (input) => {
    const d = productSchema.parse(input);
    const client = await db();
    const { id, ...values } = { ...d, image_url: d.image_url || null };
    const r = id ? await client.from("products").update(values).eq("id", id).select().single() : await client.from("products").insert(values).select().single();
    if (r.error) throw new AdminError(r.error.code === "23505" ? "That collection and package already exist." : "Product could not be saved.");
    return r.data;
  },
  adjustStock: async (input) => {
    const d = z.object({ id: z.string().uuid(), change: z.number().int().min(-1000).max(1000) }).parse(input);
    const client = await db();
    const { data: p, error } = await client.from("products").select("stock").eq("id", d.id).single();
    if (error || !p) throw new AdminError("Product not found.", 404);
    const stock = Math.max(0, p.stock + d.change);
    const u = await client.from("products").update({ stock }).eq("id", d.id);
    if (u.error) throw new AdminError("Stock could not be updated.");
    return { stock };
  },
  setStock: async (input) => {
    const d = z.object({ id: z.string().uuid(), stock: z.number().int().min(0).max(1_000_000) }).parse(input);
    const { error } = await (await db()).from("products").update({ stock: d.stock }).eq("id", d.id);
    if (error) throw new AdminError("Stock could not be updated.");
    return { stock: d.stock };
  },
  deleteProduct: async (input) => {
    const { id } = idOnly.parse(input);
    const { error } = await (await db()).from("products").delete().eq("id", id);
    if (error) throw new AdminError("Product could not be deleted.");
    return { ok: true };
  },

  listOrders: async () => {
    const { data, error } = await (await db()).from("orders").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw new AdminError("Orders could not be loaded");
    return data;
  },
  updateOrderStatus: async (input) => {
    const d = z.object({ id: z.string().uuid(), status: z.enum(ORDER_STATUSES) }).parse(input);
    const client = await db();
    const { data: order, error } = await client.from("orders").select("status, items").eq("id", d.id).single();
    if (error || !order) throw new AdminError("Order not found.", 404);
    if (order.status === "pending" && d.status === "approved") {
      const items = (order.items ?? []) as { collection: string; package: string; quantity: number }[];
      for (const item of items) {
        const { data: p } = await client.from("products").select("id, stock").eq("collection", item.collection).eq("package", item.package).maybeSingle();
        if (p) await client.from("products").update({ stock: Math.max(0, p.stock - item.quantity) }).eq("id", p.id);
      }
    }
    const u = await client.from("orders").update({ status: d.status }).eq("id", d.id);
    if (u.error) throw new AdminError("Order could not be updated.");
    return { ok: true };
  },

  listCustomers: async () => {
    const client = await db();
    const [{ data: profiles, error }, users, { data: orders }] = await Promise.all([
      client.from("profiles").select("*").order("created_at", { ascending: false }),
      client.auth.admin.listUsers({ perPage: 1000 }),
      client.from("orders").select("user_id"),
    ]);
    if (error) throw new AdminError("Customers could not be loaded");
    const bans = new Map((users.data?.users ?? []).map((u) => [u.id, (u as { banned_until?: string | null }).banned_until ?? null]));
    const counts = new Map<string, number>();
    for (const o of orders ?? []) counts.set(o.user_id, (counts.get(o.user_id) ?? 0) + 1);
    return (profiles ?? []).map((p) => {
      const until = bans.get(p.id) ?? null;
      const active = until && new Date(until).getTime() > Date.now() ? until : null;
      return { ...p, banned_until: active, orders: counts.get(p.id) ?? 0 };
    });
  },
  banCustomer: async (input) => {
    const d = z.object({ id: z.string().uuid(), duration: z.enum(["30d", "permanent", "none"]) }).parse(input);
    const ban_duration = d.duration === "30d" ? "720h" : d.duration === "permanent" ? "876000h" : "none";
    const { error } = await (await db()).auth.admin.updateUserById(d.id, { ban_duration });
    if (error) throw new AdminError("Ban could not be updated.");
    return { ok: true };
  },
  deleteCustomer: async (input) => {
    const { id } = idOnly.parse(input);
    const client = await db();
    await client.from("cart_items").delete().eq("user_id", id);
    await client.from("orders").delete().eq("user_id", id);
    await client.from("profiles").delete().eq("id", id);
    const { error } = await client.auth.admin.deleteUser(id);
    if (error && !/not.*found/i.test(error.message)) throw new AdminError("Customer could not be deleted.");
    return { ok: true };
  },

  listAdmins: async (_i, c) => {
    master(c);
    const { data, error } = await (await db()).from("admin_accounts").select("id, username, team, created_at").order("team").order("username");
    if (error) throw new AdminError("Admins could not be loaded");
    return data;
  },
  createAdmin: async (input, c) => {
    master(c);
    const d = z.object({
      username: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9._-]+$/, "Username can use letters, numbers, dots, dashes and underscores."),
      team: z.string().trim().min(2).max(60),
      password: z.string().min(8).max(200),
    }).parse(input);
    if (matches(d.username, process.env["MAQAMY_ADMIN_USERNAME"] ?? "")) throw new AdminError("That username is taken.");
    const { error } = await (await db()).from("admin_accounts").insert({ username: d.username, team: d.team, password_hash: hashPassword(d.password) });
    if (error) throw new AdminError(error.code === "23505" ? "That username is taken." : "Admin could not be created.");
    return { ok: true };
  },
  deleteAdmin: async (input, c) => {
    master(c);
    const { id } = idOnly.parse(input);
    const { error } = await (await db()).from("admin_accounts").delete().eq("id", id);
    if (error) throw new AdminError("Admin could not be removed.");
    return { ok: true };
  },
};
