import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

import { ORDER_STATUSES } from "./orders";

const list = z.array(z.string().trim().min(1).max(180)).max(30);

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  collection: z.string().trim().min(2).max(60),
  package: z.string().trim().min(1).max(60),
  description: z.string().trim().max(1000),
  specifications: list,
  features: list,
  colours: list,
  varieties: list,
  price: z.number().int().min(0).max(10_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  image_url: z.string().url().max(1000).nullable().or(z.literal("")),
  display_order: z.number().int().min(0).max(100_000),
});


type AdminSession = { authenticated?: boolean; username?: string; team?: string; master?: boolean };

function sessionConfig() {
  return {
    password: process.env['MAQAMY_ADMIN_SESSION_SECRET']!,
    name: "maqamy-admin",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/" },
  };
}

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = pbkdf2Sync(password, salt, 100_000, 32, "sha256");
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

async function requireAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.authenticated) throw new Error("Unauthorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { session: session.data, db: supabaseAdmin };
}

async function requireMaster() {
  const ctx = await requireAdmin();
  if (!ctx.session.master) throw new Error("Only the owner account can manage admins.");
  return ctx;
}

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  const d = session.data;
  return { authenticated: d.authenticated === true, username: d.username ?? "", team: d.team ?? "", master: d.master === true };
});

export const loginAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ username: z.string().trim().max(100), password: z.string().max(200) }).parse(input))
  .handler(async ({ data }) => {
    const session = await useSession<AdminSession>(sessionConfig());
    const ownerUser = process.env['MAQAMY_ADMIN_USERNAME'];
    const ownerPass = process.env['MAQAMY_ADMIN_PASSWORD'];
    if (ownerUser && ownerPass && matches(data.username, ownerUser) && matches(data.password, ownerPass)) {
      await session.update({ authenticated: true, username: ownerUser, team: "Owner", master: true });
      return { ok: true as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: account } = await supabaseAdmin.from("admin_accounts").select("username, team, password_hash").eq("username", data.username).maybeSingle();
    if (!account || !verifyPassword(data.password, account.password_hash)) return { ok: false as const };
    await session.update({ authenticated: true, username: account.username, team: account.team, master: false });
    return { ok: true as const };
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

/* ---------- Products ---------- */

export const listAdminProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await requireAdmin();
  const { data, error } = await db.from("products").select("*").order("display_order");
  if (error) throw new Error("Products could not be loaded");
  return data;
});

export const saveAdminProduct = createServerFn({ method: "POST" })
  .inputValidator((input) => productSchema.parse(input))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin();
    const { id, ...values } = { ...data, image_url: data.image_url || null };
    const result = id
      ? await db.from("products").update(values).eq("id", id).select().single()
      : await db.from("products").insert(values).select().single();
    if (result.error) throw new Error(result.error.code === "23505" ? "That collection and package already exist." : "Product could not be saved.");
    return result.data;
  });

export const adjustAdminStock = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid(), change: z.number().int().min(-1000).max(1000) }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin();
    const { data: product, error: readError } = await db.from("products").select("stock").eq("id", data.id).single();
    if (readError || !product) throw new Error("Product not found.");
    const stock = Math.max(0, product.stock + data.change);
    const { error } = await db.from("products").update({ stock }).eq("id", data.id);
    if (error) throw new Error("Stock could not be updated.");
    return { stock };
  });

export const setAdminStock = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid(), stock: z.number().int().min(0).max(1_000_000) }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin();
    const { error } = await db.from("products").update({ stock: data.stock }).eq("id", data.id);
    if (error) throw new Error("Stock could not be updated.");
    return { stock: data.stock };
  });

export const deleteAdminProduct = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin();
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error("Product could not be deleted.");
    return { ok: true as const };
  });

/* ---------- Orders ---------- */

export const listAdminOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await requireAdmin();
  const { data, error } = await db.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("Orders could not be loaded");
  return data;
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid(), status: z.enum(ORDER_STATUSES) }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin();
    const { data: order, error: readError } = await db.from("orders").select("status, items").eq("id", data.id).single();
    if (readError || !order) throw new Error("Order not found.");
    if (order.status === "pending" && data.status === "approved") {
      const items = (order.items ?? []) as { collection: string; package: string; quantity: number }[];
      for (const item of items) {
        const { data: p } = await db.from("products").select("id, stock").eq("collection", item.collection).eq("package", item.package).maybeSingle();
        if (p) await db.from("products").update({ stock: Math.max(0, p.stock - item.quantity) }).eq("id", p.id);
      }
    }
    const { error } = await db.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("Order could not be updated.");
    return { ok: true as const };
  });

/* ---------- Customers ---------- */

export const listAdminCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await requireAdmin();
  const [{ data: profiles, error }, users, { data: orders }] = await Promise.all([
    db.from("profiles").select("*").order("created_at", { ascending: false }),
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("orders").select("user_id"),
  ]);
  if (error) throw new Error("Customers could not be loaded");
  const bans = new Map((users.data?.users ?? []).map((u) => [u.id, (u as { banned_until?: string | null }).banned_until ?? null]));
  const counts = new Map<string, number>();
  for (const o of orders ?? []) counts.set(o.user_id, (counts.get(o.user_id) ?? 0) + 1);
  return (profiles ?? []).map((p) => {
    const until = bans.get(p.id) ?? null;
    const active = until && new Date(until).getTime() > Date.now() ? until : null;
    return { ...p, banned_until: active, orders: counts.get(p.id) ?? 0 };
  });
});

export const banCustomer = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid(), duration: z.enum(["30d", "permanent", "none"]) }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin();
    const ban_duration = data.duration === "30d" ? "720h" : data.duration === "permanent" ? "876000h" : "none";
    const { error } = await db.auth.admin.updateUserById(data.id, { ban_duration });
    if (error) throw new Error("Ban could not be updated.");
    return { ok: true as const };
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin();
    await db.from("cart_items").delete().eq("user_id", data.id);
    await db.from("orders").delete().eq("user_id", data.id);
    await db.from("profiles").delete().eq("id", data.id);
    const { error } = await db.auth.admin.deleteUser(data.id);
    if (error && !/not.*found/i.test(error.message)) throw new Error("Customer could not be deleted.");
    return { ok: true as const };
  });

/* ---------- Admin accounts ---------- */

export const listAdminAccounts = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await requireMaster();
  const { data, error } = await db.from("admin_accounts").select("id, username, team, created_at").order("team").order("username");
  if (error) throw new Error("Admins could not be loaded");
  return data;
});

export const createAdminAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    username: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9._-]+$/, "Username can use letters, numbers, dots, dashes and underscores."),
    team: z.string().trim().min(2).max(60),
    password: z.string().min(6).max(200),
  }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await requireMaster();
    if (matches(data.username, process.env['MAQAMY_ADMIN_USERNAME'] ?? "")) throw new Error("That username is taken.");
    const { error } = await db.from("admin_accounts").insert({ username: data.username, team: data.team, password_hash: hashPassword(data.password) });
    if (error) throw new Error(error.code === "23505" ? "That username is taken." : "Admin could not be created.");
    return { ok: true as const };
  });

export const deleteAdminAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await requireMaster();
    const { error } = await db.from("admin_accounts").delete().eq("id", data.id);
    if (error) throw new Error("Admin could not be removed.");
    return { ok: true as const };
  });
