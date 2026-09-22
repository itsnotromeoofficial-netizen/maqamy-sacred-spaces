import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  collection: z.string().trim().min(2).max(60),
  package: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500),
  specifications: z.array(z.string().trim().min(1).max(180)).max(20),
  price: z.number().int().min(0).max(10_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  image_url: z.string().url().nullable().or(z.literal("")),
  display_order: z.number().int().min(0).max(100_000),
});

type AdminSession = { authenticated?: boolean };

function sessionConfig() {
  return {
    password: process.env['MAQAMY_ADMIN_SESSION_SECRET']!,
    name: "maqamy-admin",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/" },
  };
}

function matches(input: string, expected: string) {
  const inputHash = createHash("sha256").update(input, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(inputHash, expectedHash);
}

async function requireAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.authenticated) throw new Error("Unauthorized");
}

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { authenticated: session.data.authenticated === true };
});

export const loginAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ username: z.string().max(100), password: z.string().max(200) }).parse(input))
  .handler(async ({ data }) => {
    const username = process.env['MAQAMY_ADMIN_USERNAME'];
    const password = process.env['MAQAMY_ADMIN_PASSWORD'];
    if (!username || !password || !matches(data.username, username) || !matches(data.password, password)) {
      return { ok: false as const };
    }
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ authenticated: true });
    return { ok: true as const };
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const listAdminProducts = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("products").select("*").order("display_order");
  if (error) throw new Error("Products could not be loaded");
  return data;
});

export const saveAdminProduct = createServerFn({ method: "POST" })
  .inputValidator((input) => productSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, image_url: data.image_url || null };
    const { id, ...values } = payload;
    const result = id
      ? await supabaseAdmin.from("products").update(values).eq("id", id).select().single()
      : await supabaseAdmin.from("products").insert(values).select().single();
    if (result.error) throw new Error(result.error.code === "23505" ? "That collection and package already exist." : "Product could not be saved.");
    return result.data;
  });

export const adjustAdminStock = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid(), change: z.number().int().min(-1000).max(1000) }).parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product, error: readError } = await supabaseAdmin.from("products").select("stock").eq("id", data.id).single();
    if (readError || !product) throw new Error("Product not found.");
    const stock = Math.max(0, product.stock + data.change);
    const { error } = await supabaseAdmin.from("products").update({ stock }).eq("id", data.id);
    if (error) throw new Error("Stock could not be updated.");
    return { stock };
  });

export const deleteAdminProduct = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error("Product could not be deleted.");
    return { ok: true as const };
  });