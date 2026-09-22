import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Minus, PackagePlus, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";
import { adjustAdminStock, deleteAdminProduct, getAdminSession, listAdminProducts, loginAdmin, logoutAdmin, saveAdminProduct } from "@/lib/admin.functions";
import { brandAssets, formatRM } from "@/lib/maqamy-products";

type Product = Tables<"products">;
type FormState = Omit<Product, "id" | "created_at" | "updated_at" | "active"> & { id?: string };
const emptyForm: FormState = { name: "", collection: "", package: "", description: "", specifications: [], price: 0, stock: 0, image_url: null, display_order: 100 };

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Private Catalogue — MAQAMY" },
    { name: "description", content: "Private MAQAMY catalogue management." },
    { property: "og:title", content: "Private Catalogue — MAQAMY" },
    { property: "og:description", content: "Private MAQAMY catalogue management." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: AdminPage,
});

function AdminPage() {
  const sessionFn = useServerFn(getAdminSession);
  const listFn = useServerFn(listAdminProducts);
  const loginFn = useServerFn(loginAdmin);
  const logoutFn = useServerFn(logoutAdmin);
  const saveFn = useServerFn(saveAdminProduct);
  const adjustFn = useServerFn(adjustAdminStock);
  const deleteFn = useServerFn(deleteAdminProduct);
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [specText, setSpecText] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => setProducts(await listFn());
  useEffect(() => { void sessionFn().then(async ({ authenticated: active }) => { setAuthenticated(active); if (active) await refresh(); }); }, []);

  if (authenticated === null) return <main className="flex min-h-screen items-center justify-center bg-brand-forest text-brand-cream"><div className="h-14 w-1 animate-spin-bar bg-brand-gold" /></main>;
  if (!authenticated) return <AdminLogin onSuccess={async () => { setAuthenticated(true); await refresh(); }} loginFn={loginFn} />;

  const edit = (product: Product) => {
    setForm({ id: product.id, name: product.name, collection: product.collection, package: product.package, description: product.description, specifications: product.specifications, price: product.price, stock: product.stock, image_url: product.image_url, display_order: product.display_order });
    setSpecText(product.specifications.join("\n"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const save = async () => {
    setBusy(true);
    try {
      await saveFn({ data: { ...form, specifications: specText.split("\n").map((line) => line.trim()).filter(Boolean) } });
      toast.success(form.id ? "Product updated." : "Product added.");
      setForm(emptyForm); setSpecText(""); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Product could not be saved."); }
    finally { setBusy(false); }
  };
  const adjust = async (id: string, change: number) => { await adjustFn({ data: { id, change } }); await refresh(); };
  const remove = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    await deleteFn({ data: { id: product.id } }); toast.success("Product deleted."); await refresh();
  };

  return <main className="min-h-screen bg-brand-mist text-brand-forest">
    <header className="border-b border-brand-gold/25 bg-brand-forest text-brand-cream"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8"><img src={brandAssets.logo} alt="MAQAMY" className="w-24 brightness-0 invert" /><div className="flex items-center gap-3"><span className="hidden text-xs font-bold uppercase text-brand-gold-soft sm:inline">Catalogue control</span><Button variant="ghost" size="sm" onClick={async () => { await logoutFn(); await navigate({ to: "/" }); }} className="text-brand-cream"><LogOut /> Sign out</Button></div></div></header>
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <section className="border-b border-brand-gold/30 pb-10"><p className="text-xs font-bold uppercase text-brand-gold">Private administration</p><h1 className="mt-3 font-display text-5xl font-semibold sm:text-7xl">Product catalogue.</h1></section>
      <div className="grid gap-10 py-10 lg:grid-cols-[0.85fr_1.4fr]">
        <section className="self-start border border-brand-gold/25 bg-card p-6 lg:sticky lg:top-6">
          <div className="flex items-center justify-between"><h2 className="font-display text-3xl font-semibold">{form.id ? "Edit product" : "Add product"}</h2>{form.id ? <Button variant="ghost" size="sm" onClick={() => { setForm(emptyForm); setSpecText(""); }}>Cancel</Button> : null}</div>
          <div className="mt-6 grid gap-4">
            <Field label="Product name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Collection"><Input value={form.collection} onChange={(e) => setForm({ ...form, collection: e.target.value })} /></Field><Field label="Package"><Input value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} /></Field></div>
            <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Specifications — one per line"><Textarea className="min-h-32" value={specText} onChange={(e) => setSpecText(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Price (RM)"><Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field><Field label="Opening stock"><Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></Field></div>
            <Field label="Image URL (optional)"><Input type="url" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
            <Button variant="gold" size="lg" disabled={busy || !form.name || !form.collection || !form.package} onClick={() => void save()}>{form.id ? <Save /> : <PackagePlus />}{busy ? "Saving…" : form.id ? "Save changes" : "Add product"}</Button>
          </div>
        </section>
        <section><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold uppercase text-brand-gold">Live inventory</p><h2 className="mt-2 font-display text-4xl font-semibold">{products.length} products</h2></div></div><div className="space-y-3">{products.map((product) => <article key={product.id} className="grid gap-5 border border-brand-gold/25 bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-bold uppercase text-brand-gold">{product.collection} · {product.package}</p><h3 className="mt-1 font-display text-3xl font-semibold">{product.name}</h3><p className="mt-2 text-sm text-muted-foreground">{formatRM(product.price)} · {product.specifications.join(" · ")}</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex h-10 items-center border border-brand-gold/30"><Button variant="ghost" size="icon" aria-label={`Reduce ${product.name} stock`} onClick={() => void adjust(product.id, -1)} disabled={product.stock === 0}><Minus /></Button><span className="min-w-12 text-center text-sm font-bold" aria-label={`${product.stock} in stock`}>{product.stock}</span><Button variant="ghost" size="icon" aria-label={`Increase ${product.name} stock`} onClick={() => void adjust(product.id, 1)}><Plus /></Button></div><Button variant="cream" size="sm" onClick={() => edit(product)}>Edit</Button><Button variant="ghost" size="icon" aria-label={`Delete ${product.name}`} onClick={() => void remove(product)}><Trash2 /></Button></div></article>)}</div></section>
      </div>
    </div>
  </main>;
}

function AdminLogin({ onSuccess, loginFn }: { onSuccess: () => Promise<void>; loginFn: ReturnType<typeof useServerFn<typeof loginAdmin>> }) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(false);
  return <main className="flex min-h-screen items-center justify-center bg-brand-forest px-5 text-brand-cream"><section className="w-full max-w-md border border-brand-gold/35 bg-brand-ink/40 p-7 shadow-maqamy sm:p-10"><img src={brandAssets.logo} alt="MAQAMY" className="w-28 brightness-0 invert" /><div className="mt-12 flex items-center gap-3 text-brand-gold-soft"><ShieldCheck className="size-5" /><p className="text-xs font-bold uppercase">Private administration</p></div><h1 className="mt-4 font-display text-5xl font-semibold">Welcome back.</h1><form className="mt-8 space-y-5" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(false); const result = await loginFn({ data: { username, password } }); if (result.ok) await onSuccess(); else setError(true); setBusy(false); }}><Field label="Username"><Input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="border-brand-cream/25 text-brand-cream" /></Field><Field label="Password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-brand-cream/25 text-brand-cream" /></Field>{error ? <p role="alert" className="text-sm text-destructive">The username or password is incorrect.</p> : null}<Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? "Checking…" : "Enter catalogue"}</Button></form></section></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-xs font-bold uppercase"><span>{label}</span>{children}</label>; }