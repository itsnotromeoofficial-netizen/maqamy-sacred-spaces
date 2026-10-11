import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { Button } from "@/components/ui/button";
import { formatRM } from "@/lib/maqamy-products";
import { useCart } from "@/lib/use-cart";
import { trWord } from "@/lib/i18n";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [
    { title: "Your Cart — MAQAMY" },
    { name: "description", content: "Review your saved MAQAMY prayer-space collections and prepare your purchase consultation." },
    { property: "og:title", content: "Your Cart — MAQAMY" },
    { property: "og:description", content: "Your selected MAQAMY prayer-space collections." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CartPage,
});

function CartPage() {
  const { cart, total, itemCount, userEmail, loading, updateQuantity, removeItem, signOut, reload } = useCart();
  const [placing, setPlacing] = useState(false);
  const { t, lang } = useLang();
  const [placed, setPlaced] = useState<string | null>(null);
  const placeOrder = async () => {
    setPlacing(true);
    const { data, error } = await supabase.rpc("place_order");
    setPlacing(false);
    if (error || !data) { toast.error(t("Your order could not be placed. Please try again.", "Pesanan anda tidak dapat dibuat. Sila cuba lagi.")); return; }
    setPlaced(data);
    toast.success(t(`Order ${data} received.`, `Pesanan ${data} diterima.`));
    await reload();
  };
  return (
    <main className="min-h-screen bg-brand-cream text-brand-forest">
      <SiteHeader tone="dark" itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} />
      <section className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">{t("Your selection", "Pilihan anda")}</p>
          <h1 className="mt-4 font-display text-6xl font-light leading-none sm:text-8xl">{t("The cart.", "Troli.")}</h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">{t("A considered overview of the prayer spaces you have selected for your home.", "Gambaran teliti ruang solat yang telah anda pilih untuk rumah anda.")}</p>
          {loading ? <div className="mx-auto my-24 h-12 w-1 animate-spin-bar bg-brand-gold" /> : placed ? <OrderPlaced number={placed} /> : !userEmail ? <SignedOut /> : cart.length === 0 ? <EmptyCart /> : (
            <div className="mt-14 grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-start">
              <div className="space-y-4">
                {cart.map((item) => (
                  <article key={item.id} className="grid gap-5 border border-brand-gold/25 bg-card p-5 shadow-gold sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
                    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">{t(`${item.package} edition`, `Edisi ${trWord(item.package, lang)}`)}</p><h2 className="mt-2 font-display text-4xl font-light">{item.collection}</h2><p className="mt-3 text-sm text-muted-foreground">{formatRM(item.unit_price)} {item.package === "Bespoke" ? t("starting price", "harga permulaan") : t("per set", "setiap set")}</p></div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="flex items-center border border-brand-gold/25"><Button variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => void updateQuantity(item, item.quantity - 1)}><Minus /></Button><span className="w-10 text-center text-sm font-bold">{item.quantity}</span><Button variant="ghost" size="icon" aria-label="Increase quantity" disabled={item.quantity >= 10} onClick={() => void updateQuantity(item, item.quantity + 1)}><Plus /></Button></div>
                      <p className="min-w-28 text-right font-bold">{formatRM(item.unit_price * item.quantity)}{item.package === "Bespoke" ? "+" : ""}</p>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${item.collection} ${item.package}`} onClick={() => void removeItem(item.id)}><Trash2 /></Button>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="border border-brand-gold/30 bg-brand-forest p-6 text-brand-cream lg:sticky lg:top-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold-soft">{t("Summary", "Ringkasan")}</p>
                <div className="mt-8 flex items-baseline justify-between border-b border-brand-cream/20 pb-6"><span className="text-sm">{t("Estimated total", "Anggaran jumlah")}</span><strong className="font-display text-4xl">{formatRM(total)}+</strong></div>
                <p className="mt-5 text-xs leading-6 text-brand-cream/70">{t("Your order is sent to our team for approval. You will receive an order number instantly and can follow its progress.", "Pesanan anda dihantar kepada pasukan kami untuk kelulusan. Anda akan menerima nombor pesanan serta-merta dan boleh mengikuti perkembangannya.")}</p>
                <Button variant="gold" size="lg" className="mt-8 w-full" disabled={placing} onClick={() => void placeOrder()}>{placing ? t("Placing order…", "Membuat pesanan…") : t("Place order", "Buat pesanan")} <ArrowRight /></Button>
              </aside>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function SignedOut() { const { t } = useLang(); return <div className="mt-14 border-y border-brand-gold/25 py-20 text-center"><UserRound className="mx-auto size-9 text-brand-gold" /><h2 className="mt-5 font-display text-4xl font-light">{t("Your private cart begins with an account.", "Troli peribadi anda bermula dengan akaun.")}</h2><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">{t("Register with your name, phone number, email, and address to save your selections.", "Daftar dengan nama, nombor telefon, e-mel dan alamat anda untuk menyimpan pilihan anda.")}</p><Button asChild variant="gold" size="lg" className="mt-7"><Link to="/auth" search={{ redirect: "/cart" }}>{t("Register or sign in", "Daftar atau log masuk")} <ArrowRight /></Link></Button></div>; }
function EmptyCart() { const { t } = useLang(); return <div className="mt-14 border-y border-brand-gold/25 py-20 text-center"><ShoppingBag className="mx-auto size-9 text-brand-gold" /><h2 className="mt-5 font-display text-4xl font-light">{t("Your cart is ready for a collection.", "Troli anda sedia untuk sebuah koleksi.")}</h2><Button asChild variant="maqamy" size="lg" className="mt-7"><Link to="/collections">{t("Explore Noor & Janna", "Terokai Noor & Janna")} <ArrowRight /></Link></Button></div>; }

function OrderPlaced({ number }: { number: string }) { const { t } = useLang(); return <div className="animate-fade-soft mt-14 border-y border-brand-gold/25 py-20 text-center"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">{t("Order received", "Pesanan diterima")}</p><h2 className="mt-5 font-display text-5xl font-light">{number}</h2><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">{t("Thank you. Our team will review and approve your order shortly. Keep this number — you can follow every step on your orders page.", "Terima kasih. Pasukan kami akan menyemak dan meluluskan pesanan anda tidak lama lagi. Simpan nombor ini — anda boleh mengikuti setiap langkah di halaman pesanan anda.")}</p><Button asChild variant="gold" size="lg" className="mt-7"><Link to="/orders">{t("Track my orders", "Jejak pesanan saya")} <ArrowRight /></Link></Button></div>; }
