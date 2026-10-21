import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, PackageSearch } from "lucide-react";
import { useEffect, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatRM } from "@/lib/maqamy-products";
import { ORDER_LABELS, ORDER_STEPS, type OrderItem, type OrderStatus } from "@/lib/orders";
import { useCart } from "@/lib/use-cart";
import { ORDER_LABELS_MS, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [
    { title: "My Orders — MAQAMY" },
    { name: "description", content: "Follow every MAQAMY order from approval to delivery." },
    { property: "og:title", content: "My Orders — MAQAMY" },
    { property: "og:description", content: "Track your MAQAMY prayer-space orders." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: OrdersPage,
});

function OrdersPage() {
  const { itemCount, userEmail, loading, signOut } = useCart();
  const { t } = useLang();
  const [orders, setOrders] = useState<Tables<"orders">[] | null>(null);

  useEffect(() => {
    if (loading || !userEmail) return;
    void supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => setOrders(data ?? []));
  }, [loading, userEmail]);

  return (
    <main className="min-h-screen bg-brand-cream text-brand-forest">
      <SiteHeader tone="dark" itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} />
      <section className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="type-label text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">{t("Your orders", "Pesanan anda")}</p>
          <h1 className="type-heading mt-4 font-display text-3xl font-light leading-tight sm:text-4xl">{t("Order journey.", "Perjalanan pesanan.")}</h1>
          {loading || (userEmail && !orders) ? <div className="mx-auto my-24 h-12 w-1 animate-spin-bar bg-brand-gold" /> : !userEmail ? (
            <Notice title={t("Sign in to see your orders.", "Log masuk untuk melihat pesanan anda.")} cta={<Link to="/auth" search={{ redirect: "/orders" }}>{t("Sign in", "Log masuk")} <ArrowRight /></Link>} />
          ) : orders!.length === 0 ? (
            <Notice title={t("No orders yet.", "Belum ada pesanan.")} cta={<Link to="/collections">{t("Explore collections", "Terokai koleksi")} <ArrowRight /></Link>} />
          ) : (
            <div className="mt-14 space-y-6">
              {orders!.map((order) => <OrderCard key={order.id} order={order} />)}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function OrderCard({ order }: { order: Tables<"orders"> }) {
  const status = order.status as OrderStatus;
  const items = order.items as unknown as OrderItem[];
  const reached = ORDER_STEPS.indexOf(status);
  const { t, lang } = useLang();
  const [invoice, setInvoice] = useState<Tables<"invoices"> | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const canInvoice = status !== "pending" && status !== "rejected";

  const toggleInvoice = async () => {
    if (showInvoice) { setShowInvoice(false); return; }
    if (!invoice) {
      const { data } = await supabase.from("invoices").select("*").eq("order_id", order.id).maybeSingle();
      if (data) setInvoice(data);
    }
    setShowInvoice(true);
  };

  return (
    <article className="animate-fade-soft border border-brand-gold/25 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="type-label text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">{t("Order number", "Nombor pesanan")}</p>
          <h2 className="type-heading mt-2 font-display text-4xl font-light">{order.order_number}</h2>
          <p className="type-body mt-1 text-sm text-muted-foreground">{t("Placed", "Dibuat")} {new Date(order.created_at).toLocaleString(lang === "ms" ? "ms-MY" : "en-MY")}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl type-price">{formatRM(order.total)}</p>
          {canInvoice ? <Button variant="ghost" size="sm" className="mt-2" onClick={() => void toggleInvoice()}>{showInvoice ? t("Hide invoice", "Sembunyi invois") : t("View invoice", "Lihat invois")}</Button> : null}
        </div>
      </div>

      {showInvoice ? (
        invoice ? (
          <div className="animate-fade-soft mt-8 border border-brand-gold/40 bg-brand-cream p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-forest/15 pb-5">
              <div>
                <p className="type-label text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">{t("Invoice", "Invois")}</p>
                <h3 className="type-heading mt-2 font-display text-3xl font-light">{invoice.invoice_number}</h3>
                <p className="type-body mt-1 text-xs text-muted-foreground">{t("Issued", "Dikeluarkan")} {new Date(invoice.created_at).toLocaleString(lang === "ms" ? "ms-MY" : "en-MY")} · {t("Order", "Pesanan")} {invoice.order_number}</p>
              </div>
              <p className="type-body font-display text-2xl">MAQAMY</p>
            </div>
            <div className="mt-5 grid gap-1 text-sm">
              <p className="font-semibold">{invoice.customer_name}</p>
              <p className="type-body text-muted-foreground">{invoice.customer_email} · {invoice.customer_phone}</p>
              <p className="type-body text-muted-foreground">{invoice.customer_address}</p>
            </div>
            <ul className="type-body mt-5 border-t border-brand-forest/10 pt-4 text-sm">
              {(invoice.items as unknown as OrderItem[]).map((item, i) => <li key={i} className="flex justify-between py-1"><span>{item.quantity} × {item.name ?? `${item.collection} ${item.package}`}</span><span>{formatRM(item.unit_price * item.quantity)}</span></li>)}
            </ul>
            <div className="mt-4 flex justify-between border-t border-brand-forest/15 pt-4">
              <p className="type-label text-xs font-semibold uppercase tracking-[0.2em]">{t("Total", "Jumlah")}</p>
              <p className="font-display text-2xl type-price">{formatRM(invoice.total)}</p>
            </div>
          </div>
        ) : (
          <p className="type-body animate-fade-soft mt-8 border-l-2 border-brand-gold pl-4 text-sm">{t("Your invoice will appear here once it is issued.", "Invois anda akan muncul di sini setelah dikeluarkan.")}</p>
        )
      ) : null}

      {status === "rejected" ? (
        <p className="type-body mt-8 border-l-2 border-destructive pl-4 text-sm">{t("This order was declined. Our team will contact you about it.", "Pesanan ini telah ditolak. Pasukan kami akan menghubungi anda mengenainya.")}</p>
      ) : status === "pending" ? (
        <p className="type-body mt-8 border-l-2 border-brand-gold pl-4 text-sm">{t("Awaiting approval from our team. Progress will appear here once it is approved.", "Menunggu kelulusan daripada pasukan kami. Perkembangan akan dipaparkan di sini setelah diluluskan.")}</p>
      ) : (
        <ol className="mt-8 grid grid-cols-5 gap-2">
          {ORDER_STEPS.map((step, i) => (
            <li key={step} className="text-center">
              <div className={`h-1 transition-colors duration-500 ${i <= reached ? "bg-brand-forest" : "bg-brand-forest/15"}`} />
              <span className={`mx-auto -mt-2.5 flex size-4 items-center justify-center rounded-full transition-colors duration-500 ${i <= reached ? "bg-brand-forest text-brand-cream" : "bg-brand-cream-deep"}`}>{i <= reached ? <Check className="size-3" /> : null}</span>
              <p className={`mt-3 text-[10px] font-semibold uppercase tracking-[0.15em] sm:text-xs ${i <= reached ? "text-brand-forest" : "text-muted-foreground"}`}>{lang === "ms" ? ORDER_LABELS_MS[step] : ORDER_LABELS[step]}</p>
            </li>
          ))}
        </ol>
      )}

      <ul className="type-body mt-8 border-t border-brand-forest/10 pt-4 text-sm">
        {items.map((item, i) => <li key={i} className="flex justify-between py-1"><span>{item.quantity} × {item.name ?? `${item.collection} ${item.package}`}</span><span>{formatRM(item.unit_price * item.quantity)}</span></li>)}
      </ul>
    </article>
  );
}

function Notice({ title, cta }: { title: string; cta: React.ReactNode }) {
  return (
    <div className="animate-fade-soft mt-14 border-y border-brand-gold/25 py-20 text-center">
      <PackageSearch className="mx-auto size-9 text-brand-gold" />
      <h2 className="type-heading mt-5 font-display text-4xl font-light">{title}</h2>
      <Button asChild variant="gold" size="lg" className="mt-7">{cta}</Button>
    </div>
  );
}
