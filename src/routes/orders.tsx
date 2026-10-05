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
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">Your orders</p>
          <h1 className="mt-4 font-display text-6xl font-light leading-none sm:text-8xl">Order journey.</h1>
          {loading || (userEmail && !orders) ? <div className="mx-auto my-24 h-12 w-1 animate-spin-bar bg-brand-gold" /> : !userEmail ? (
            <Notice title="Sign in to see your orders." cta={<Link to="/auth" search={{ redirect: "/orders" }}>Sign in <ArrowRight /></Link>} />
          ) : orders!.length === 0 ? (
            <Notice title="No orders yet." cta={<Link to="/collections">Explore collections <ArrowRight /></Link>} />
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
  return (
    <article className="animate-fade-soft border border-brand-gold/25 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">Order number</p>
          <h2 className="mt-2 font-display text-4xl font-light">{order.order_number}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <p className="font-display text-3xl">{formatRM(order.total)}</p>
      </div>

      {status === "rejected" ? (
        <p className="mt-8 border-l-2 border-destructive pl-4 text-sm">This order was declined. Our team will contact you about it.</p>
      ) : status === "pending" ? (
        <p className="mt-8 border-l-2 border-brand-gold pl-4 text-sm">Awaiting approval from our team. Progress will appear here once it is approved.</p>
      ) : (
        <ol className="mt-8 grid grid-cols-5 gap-2">
          {ORDER_STEPS.map((step, i) => (
            <li key={step} className="text-center">
              <div className={`h-1 transition-colors duration-500 ${i <= reached ? "bg-brand-forest" : "bg-brand-forest/15"}`} />
              <span className={`mx-auto -mt-2.5 flex size-4 items-center justify-center rounded-full transition-colors duration-500 ${i <= reached ? "bg-brand-forest text-brand-cream" : "bg-brand-cream-deep"}`}>{i <= reached ? <Check className="size-3" /> : null}</span>
              <p className={`mt-3 text-[10px] font-semibold uppercase tracking-[0.15em] sm:text-xs ${i <= reached ? "text-brand-forest" : "text-muted-foreground"}`}>{ORDER_LABELS[step]}</p>
            </li>
          ))}
        </ol>
      )}

      <ul className="mt-8 border-t border-brand-forest/10 pt-4 text-sm">
        {items.map((item, i) => <li key={i} className="flex justify-between py-1"><span>{item.quantity} × {item.name ?? `${item.collection} ${item.package}`}</span><span>{formatRM(item.unit_price * item.quantity)}</span></li>)}
      </ul>
    </article>
  );
}

function Notice({ title, cta }: { title: string; cta: React.ReactNode }) {
  return (
    <div className="animate-fade-soft mt-14 border-y border-brand-gold/25 py-20 text-center">
      <PackageSearch className="mx-auto size-9 text-brand-gold" />
      <h2 className="mt-5 font-display text-4xl font-light">{title}</h2>
      <Button asChild variant="gold" size="lg" className="mt-7">{cta}</Button>
    </div>
  );
}
