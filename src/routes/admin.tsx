import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Ban, LogOut, Minus, PackageX, PackagePlus, Plus, Save, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";
import {
  adjustAdminStock, banCustomer, createAdminAccount, deleteAdminAccount, deleteAdminProduct, deleteCustomer,
  getAdminSession, listAdminAccounts, listAdminCustomers, listAdminOrders, listAdminProducts, loginAdmin,
  logoutAdmin, saveAdminProduct, setAdminStock, updateOrderStatus,
  type AdminAccount, type AdminCustomer, type AdminSession,
} from "@/lib/admin-api";
import { brandAssets, formatRM } from "@/lib/maqamy-products";
import { ORDER_LABELS, ORDER_STATUSES, parseList, type OrderItem, type OrderStatus } from "@/lib/orders";

type Product = Tables<"products">;
type Order = Tables<"orders">;
type Tab = "orders" | "products" | "customers" | "admins";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Private Administration — MAQAMY" },
    { name: "description", content: "Private MAQAMY store administration." },
    { property: "og:title", content: "Private Administration — MAQAMY" },
    { property: "og:description", content: "Private MAQAMY store administration." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: AdminPage,
});

const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

function AdminPage() {
  const logoutFn = logoutAdmin;
  const navigate = useNavigate();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("orders");

  const load = () => { setLoadError(null); getAdminSession().then(setSession).catch((e) => setLoadError(errorText(e, "Could not reach the server."))); };
  useEffect(() => { load(); }, []);

  if (loadError) return <main className="flex min-h-screen items-center justify-center bg-brand-forest px-5 text-center text-brand-cream"><div className="animate-fade-soft"><p className="font-display text-3xl font-light">{loadError}</p><Button variant="gold" className="mt-6" onClick={load}>Try again</Button></div></main>;
  if (session === null) return <main className="flex min-h-screen items-center justify-center bg-brand-forest"><div className="h-14 w-1 animate-spin-bar bg-brand-gold" /></main>;
  if (!session.authenticated) return <AdminLogin onSuccess={setSession} />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "orders", label: "Orders" },
    { id: "products", label: "Products" },
    { id: "customers", label: "Customers" },
    ...(session.master ? [{ id: "admins" as Tab, label: "Admin team" }] : []),
  ];

  return <main className="min-h-screen bg-brand-mist text-brand-forest">
    <header className="border-b border-brand-gold/25 bg-brand-forest text-brand-cream">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <img src={brandAssets.logo} alt="MAQAMY" className="w-24 brightness-0 invert" />
        <div className="flex items-center gap-4">
          <span className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold-soft sm:inline">{session.username} · {session.team}</span>
          <Button variant="ghost" size="sm" onClick={async () => { await logoutFn(); await navigate({ to: "/" }); }} className="text-brand-cream"><LogOut /> Sign out</Button>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">Private administration</p>
      <h1 className="mt-3 font-display text-5xl font-light sm:text-7xl">Store control.</h1>
      <nav className="mt-10 flex gap-1 overflow-x-auto border-b border-brand-gold/30">
        {tabs.map((t) => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`-mb-px whitespace-nowrap border-b-2 px-5 py-3 text-sm font-semibold transition-colors duration-300 ${tab === t.id ? "border-brand-forest text-brand-forest" : "border-transparent text-muted-foreground hover:text-brand-forest"}`}>{t.label}</button>)}
      </nav>
      <div key={tab} className="animate-fade-soft py-10">
        {tab === "orders" ? <OrdersPanel /> : tab === "products" ? <ProductsPanel /> : tab === "customers" ? <CustomersPanel /> : <AdminsPanel />}
      </div>
    </div>
  </main>;
}

/* ---------------- Orders ---------------- */

function OrdersPanel() {
  const listFn = listAdminOrders;
  const statusFn = updateOrderStatus;
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const refresh = () => listFn().then(setOrders).catch((e) => toast.error(errorText(e, "Orders could not be loaded")));
  useEffect(() => { void refresh(); }, []);
  const shown = useMemo(() => (orders ?? []).filter((o) => filter === "all" || o.status === filter), [orders, filter]);
  const pending = (orders ?? []).filter((o) => o.status === "pending").length;

  const setStatus = async (order: Order, status: OrderStatus) => {
    try { await statusFn({ data: { id: order.id, status } }); toast.success(`${order.order_number} · ${ORDER_LABELS[status]}`); await refresh(); }
    catch (e) { toast.error(errorText(e, "Order could not be updated.")); }
  };

  if (!orders) return <Loading />;
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">Incoming orders</p><h2 className="mt-2 font-display text-4xl font-light">{pending} awaiting approval</h2></div>
      <select value={filter} onChange={(e) => setFilter(e.target.value as OrderStatus | "all")} className="h-10 border border-brand-gold/30 bg-card px-3 text-sm">
        <option value="all">All orders</option>
        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_LABELS[s]}</option>)}
      </select>
    </div>
    <div className="mt-6 space-y-3">
      {shown.length === 0 ? <Empty text="No orders here yet." /> : shown.map((order) => {
        const items = order.items as unknown as OrderItem[];
        return <article key={order.id} className="animate-fade-soft border border-brand-gold/25 bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">{order.order_number} · {new Date(order.created_at).toLocaleString()}</p>
              <h3 className="mt-1 font-display text-2xl">{order.customer_name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{order.customer_email} · {order.customer_phone}</p>
              <p className="text-sm text-muted-foreground">{order.customer_address}</p>
            </div>
            <div className="text-right">
              <StatusPill status={order.status as OrderStatus} />
              <p className="mt-3 font-display text-3xl">{formatRM(order.total)}</p>
            </div>
          </div>
          <ul className="mt-4 border-t border-brand-forest/10 pt-4 text-sm">
            {items.map((item, i) => <li key={i} className="flex justify-between py-1"><span>{item.quantity} × {item.name ?? `${item.collection} ${item.package}`}</span><span>{formatRM(item.unit_price * item.quantity)}</span></li>)}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            {order.status === "pending" ? <>
              <Button variant="maqamy" size="sm" onClick={() => void setStatus(order, "approved")}>Approve</Button>
              <Button variant="ghost" size="sm" onClick={() => void setStatus(order, "rejected")}>Decline</Button>
            </> : order.status !== "rejected" ? (
              <select value={order.status} onChange={(e) => void setStatus(order, e.target.value as OrderStatus)} className="h-8 border border-brand-gold/30 bg-card px-2 text-xs">
                {ORDER_STATUSES.filter((s) => s !== "pending").map((s) => <option key={s} value={s}>{ORDER_LABELS[s]}</option>)}
              </select>
            ) : null}
          </div>
        </article>;
      })}
    </div>
  </section>;
}

function StatusPill({ status }: { status: OrderStatus }) {
  const tone = status === "pending" ? "bg-maqamy-gold text-brand-forest" : status === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-brand-forest text-brand-cream";
  return <span className={`inline-block px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${tone}`}>{ORDER_LABELS[status]}</span>;
}

/* ---------------- Products ---------------- */

type FormState = {
  id?: string; name: string; collection: string; package: string; description: string; price: number; stock: number;
  image_url: string; display_order: number; specifications: string; features: string; colours: string; varieties: string;
};
const emptyForm: FormState = { name: "", collection: "MAQAMY", package: "", description: "", price: 0, stock: 0, image_url: "", display_order: 100, specifications: "", features: "", colours: "", varieties: "" };

function ProductsPanel() {
  const listFn = listAdminProducts;
  const saveFn = saveAdminProduct;
  const adjustFn = adjustAdminStock;
  const setStockFn = setAdminStock;
  const deleteFn = deleteAdminProduct;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const refresh = () => listFn().then(setProducts).catch((e) => toast.error(errorText(e, "Products could not be loaded")));
  useEffect(() => { void refresh(); }, []);

  const edit = (p: Product) => {
    setForm({ id: p.id, name: p.name, collection: p.collection, package: p.package, description: p.description, price: p.price, stock: p.stock, image_url: p.image_url ?? "", display_order: p.display_order, specifications: p.specifications.join("\n"), features: p.features.join("\n"), colours: p.colours.join(", "), varieties: p.varieties.join(", ") });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const save = async () => {
    setBusy(true);
    try {
      await saveFn({ data: {
        id: form.id, name: form.name, collection: form.collection || "MAQAMY", package: form.package || form.name,
        description: form.description, price: form.price, stock: form.stock, image_url: form.image_url, display_order: form.display_order,
        specifications: form.specifications.split("\n").map((s) => s.trim()).filter(Boolean),
        features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
        colours: parseList(form.colours), varieties: parseList(form.varieties),
      } });
      toast.success(form.id ? "Product updated." : "Product added.");
      setForm(emptyForm); await refresh();
    } catch (e) { toast.error(errorText(e, "Product could not be saved.")); }
    finally { setBusy(false); }
  };
  const run = async (fn: () => Promise<unknown>, msg?: string) => { try { await fn(); if (msg) toast.success(msg); await refresh(); } catch (e) { toast.error(errorText(e, "Something went wrong.")); } };

  return <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr]">
    <section className="self-start border border-brand-gold/25 bg-card p-6 lg:sticky lg:top-6">
      <div className="flex items-center justify-between"><h2 className="font-display text-3xl font-light">{form.id ? "Edit product" : "Add product"}</h2>{form.id ? <Button variant="ghost" size="sm" onClick={() => setForm(emptyForm)}>Cancel</Button> : null}</div>
      <div className="mt-6 grid gap-4">
        <Field label="Product name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (RM)"><Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
          <Field label="Stock"><Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Features — one per line"><Textarea className="min-h-24" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></Field>
        <Field label="Specifications — one per line"><Textarea className="min-h-24" value={form.specifications} onChange={(e) => setForm({ ...form, specifications: e.target.value })} /></Field>
        <Field label="Colours — separate with commas"><Input placeholder="Sage, Ivory, Walnut" value={form.colours} onChange={(e) => setForm({ ...form, colours: e.target.value })} /></Field>
        <Field label="Available varieties — separate with commas"><Input placeholder="Small, Large" value={form.varieties} onChange={(e) => setForm({ ...form, varieties: e.target.value })} /></Field>
        <Field label="Product image link"><Input type="url" placeholder="https://…" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
        {form.image_url ? <img src={form.image_url} alt="Preview" className="max-h-48 w-full bg-brand-mist object-contain" /> : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Collection"><Input value={form.collection} onChange={(e) => setForm({ ...form, collection: e.target.value })} /></Field>
          <Field label="Edition (optional)"><Input placeholder="Same as name" value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} /></Field>
        </div>
        <Button variant="gold" size="lg" disabled={busy || form.name.trim().length < 2} onClick={() => void save()}>{form.id ? <Save /> : <PackagePlus />}{busy ? "Saving…" : form.id ? "Save changes" : "Add product"}</Button>
      </div>
    </section>
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">Live inventory</p>
      <h2 className="mt-2 font-display text-4xl font-light">{products?.length ?? 0} products</h2>
      {!products ? <Loading /> : <div className="mt-6 space-y-3">{products.map((p) => <article key={p.id} className="animate-fade-soft grid gap-5 border border-brand-gold/25 bg-card p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex h-20 w-20 items-center justify-center bg-brand-mist">{p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" /> : <span className="font-display text-xl text-brand-forest/30">{p.name.slice(0, 1)}</span>}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">{p.collection} · {p.package}</p>
              <h3 className="mt-1 font-display text-2xl">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{formatRM(p.price)}{p.colours.length ? ` · ${p.colours.join(", ")}` : ""}{p.varieties.length ? ` · ${p.varieties.join(", ")}` : ""}</p>
            </div>
            {p.stock === 0 ? <span className="bg-destructive px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-destructive-foreground">Out of stock</span> : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex h-10 items-center border border-brand-gold/30">
              <Button variant="ghost" size="icon" aria-label={`Reduce ${p.name} stock`} onClick={() => void run(() => adjustFn({ data: { id: p.id, change: -1 } }))} disabled={p.stock === 0}><Minus /></Button>
              <span className="min-w-12 text-center text-sm font-semibold">{p.stock}</span>
              <Button variant="ghost" size="icon" aria-label={`Increase ${p.name} stock`} onClick={() => void run(() => adjustFn({ data: { id: p.id, change: 1 } }))}><Plus /></Button>
            </div>
            <Button variant="cream" size="sm" disabled={p.stock === 0} onClick={() => void run(() => setStockFn({ data: { id: p.id, stock: 0 } }), `${p.name} is now out of stock.`)}><PackageX /> Out of stock</Button>
            <Button variant="cream" size="sm" onClick={() => edit(p)}>Edit</Button>
            <Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`} onClick={() => { if (window.confirm(`Delete ${p.name}? This cannot be undone.`)) void run(() => deleteFn({ data: { id: p.id } }), "Product deleted."); }}><Trash2 /></Button>
          </div>
        </div>
      </article>)}</div>}
    </section>
  </div>;
}

/* ---------------- Customers ---------------- */

type Customer = AdminCustomer;

function CustomersPanel() {
  const listFn = listAdminCustomers;
  const banFn = banCustomer;
  const deleteFn = deleteCustomer;
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [query, setQuery] = useState("");
  const refresh = () => listFn().then(setCustomers).catch((e) => toast.error(errorText(e, "Customers could not be loaded")));
  useEffect(() => { void refresh(); }, []);
  const run = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast.success(msg); await refresh(); } catch (e) { toast.error(errorText(e, "Something went wrong.")); } };
  const shown = (customers ?? []).filter((c) => `${c.full_name} ${c.email} ${c.phone} ${c.address}`.toLowerCase().includes(query.toLowerCase()));

  if (!customers) return <Loading />;
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">Registered customers</p><h2 className="mt-2 font-display text-4xl font-light">{customers.length} people</h2></div>
      <Input placeholder="Search name, email, phone, address" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs bg-card" />
    </div>
    <div className="mt-6 space-y-3">
      {shown.length === 0 ? <Empty text="No customers found." /> : shown.map((c) => {
        const permanent = c.banned_until && new Date(c.banned_until).getFullYear() > 2100;
        return <article key={c.id} className="animate-fade-soft grid gap-4 border border-brand-gold/25 bg-card p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-2xl">{c.full_name}</h3>
              {c.banned_until ? <span className="bg-destructive px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-destructive-foreground">{permanent ? "Banned permanently" : `Banned until ${new Date(c.banned_until).toLocaleDateString()}`}</span> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{c.email} · {c.phone}</p>
            <p className="text-sm text-muted-foreground">{c.address}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">{c.orders} orders · joined {new Date(c.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.banned_until ? <Button variant="cream" size="sm" onClick={() => void run(() => banFn({ data: { id: c.id, duration: "none" } }), `${c.full_name} unbanned.`)}>Unban</Button> : <>
              <Button variant="cream" size="sm" onClick={() => void run(() => banFn({ data: { id: c.id, duration: "30d" } }), `${c.full_name} banned for 30 days.`)}><Ban /> 30 days</Button>
              <Button variant="cream" size="sm" onClick={() => { if (window.confirm(`Ban ${c.full_name} permanently?`)) void run(() => banFn({ data: { id: c.id, duration: "permanent" } }), `${c.full_name} banned permanently.`); }}><Ban /> Permanent</Button>
            </>}
            <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`Delete ${c.full_name} and all their data? This cannot be undone.`)) void run(() => deleteFn({ data: { id: c.id } }), "Customer deleted."); }}><Trash2 /> Delete</Button>
          </div>
        </article>;
      })}
    </div>
  </section>;
}

/* ---------------- Admin accounts ---------------- */

function AdminsPanel() {
  const listFn = listAdminAccounts;
  const createFn = createAdminAccount;
  const deleteFn = deleteAdminAccount;
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [form, setForm] = useState({ team: "", username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const refresh = () => listFn().then(setAdmins).catch((e) => toast.error(errorText(e, "Admins could not be loaded")));
  useEffect(() => { void refresh(); }, []);

  const create = async () => {
    setBusy(true);
    try { await createFn({ data: form }); toast.success(`${form.username} can now sign in.`); setForm({ team: form.team, username: "", password: "" }); await refresh(); }
    catch (e) { toast.error(errorText(e, "Admin could not be created.")); }
    finally { setBusy(false); }
  };
  const teams = [...new Set((admins ?? []).map((a) => a.team))];

  return <div className="grid gap-10 lg:grid-cols-[0.8fr_1.4fr]">
    <section className="self-start border border-brand-gold/25 bg-card p-6">
      <h2 className="font-display text-3xl font-light">New admin</h2>
      <div className="mt-6 grid gap-4">
        <Field label="Team / department"><Input list="admin-teams" placeholder="Sales department" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} /></Field>
        <datalist id="admin-teams">{teams.map((t) => <option key={t} value={t} />)}</datalist>
        <Field label="Username"><Input autoComplete="off" placeholder="alex1" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
        <Field label="Password"><Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Button variant="gold" size="lg" disabled={busy || !form.team || !form.username || form.password.length < 8} onClick={() => void create()}><UserPlus />{busy ? "Creating…" : "Create admin"}</Button>
        <p className="text-xs leading-6 text-muted-foreground">Passwords need at least 8 characters. Only you, the owner, can see this tab.</p>
      </div>
    </section>
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">Admin team</p>
      <h2 className="mt-2 font-display text-4xl font-light">{admins?.length ?? 0} accounts</h2>
      {!admins ? <Loading /> : admins.length === 0 ? <div className="mt-6"><Empty text="No extra admins yet." /></div> : <div className="mt-6 space-y-8">{teams.map((team) => <div key={team}>
        <p className="border-b border-brand-gold/30 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">{team}</p>
        {admins.filter((a) => a.team === team).map((a) => <div key={a.id} className="animate-fade-soft flex items-center justify-between border-b border-brand-forest/10 py-3">
          <div><p className="font-semibold">{a.username}</p><p className="text-xs text-muted-foreground">Added {new Date(a.created_at).toLocaleDateString()}</p></div>
          <Button variant="ghost" size="icon" aria-label={`Remove ${a.username}`} onClick={() => { if (window.confirm(`Remove ${a.username}?`)) void deleteFn({ data: { id: a.id } }).then(() => { toast.success("Admin removed."); return refresh(); }); }}><Trash2 /></Button>
        </div>)}
      </div>)}</div>}
    </section>
  </div>;
}

/* ---------------- Shared ---------------- */

function Loading() { return <div className="mx-auto my-16 h-12 w-1 animate-spin-bar bg-brand-gold" />; }
function Empty({ text }: { text: string }) { return <p className="border border-dashed border-brand-gold/40 py-14 text-center text-sm text-muted-foreground">{text}</p>; }

function AdminLogin({ onSuccess, loginFn }: { onSuccess: () => Promise<unknown>; loginFn: (options: { data: { username: string; password: string } }) => Promise<{ ok: boolean }> }) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(false);
  return <main className="flex min-h-screen items-center justify-center bg-brand-forest px-5 text-brand-cream">
    <section className="animate-fade-soft w-full max-w-md border border-brand-gold/35 bg-brand-ink/40 p-7 shadow-maqamy sm:p-10">
      <img src={brandAssets.logo} alt="MAQAMY" className="w-28 brightness-0 invert" />
      <div className="mt-12 flex items-center gap-3 text-brand-gold-soft"><ShieldCheck className="size-5" /><p className="text-xs font-semibold uppercase tracking-[0.3em]">Private administration</p></div>
      <h1 className="mt-4 font-display text-5xl font-light">Welcome back.</h1>
      <form className="mt-8 space-y-5" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(false); try { const result = await loginFn({ data: { username, password } }); if (result.ok) { const s = await onSuccess() as { authenticated?: boolean } | undefined; if (s && !s.authenticated) setError(true); } else setError(true); } catch { setError(true); } finally { setBusy(false); } }}>
        <Field label="Username"><Input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="border-brand-cream/25 bg-transparent text-brand-cream" /></Field>
        <Field label="Password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-brand-cream/25 bg-transparent text-brand-cream" /></Field>
        {error ? <p className="animate-fade-soft text-sm text-brand-gold-soft">Those details were not recognised.</p> : null}
        <Button variant="gold" size="lg" className="w-full" disabled={busy || !username || !password}>{busy ? "Checking…" : "Enter"}</Button>
      </form>
    </section>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.15em]"><span>{label}</span>{children}</label>; }
