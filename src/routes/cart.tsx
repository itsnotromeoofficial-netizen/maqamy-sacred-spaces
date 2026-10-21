import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { formatRM } from "@/lib/maqamy-products";
import { getStripeEnvironment } from "@/lib/stripe";
import { useCart } from "@/lib/use-cart";
import { createCheckoutSession } from "@/utils/payments.functions";
import { trWord, useLang } from "@/lib/i18n";
import { ShopperChallenge } from "@/components/maqamy/shopper-challenge";

export const Route = createFileRoute("/cart")({
  validateSearch: (search: Record<string, unknown>): { order?: string; payment?: string } => {
    const out: { order?: string; payment?: string } = {};
    if (typeof search['order'] === "string") out['order'] = search['order'];
    if (typeof search['payment'] === "string") out['payment'] = search['payment'];
    return out;
  },
  head: () => ({ meta: [
    { title: "Your Cart — MAQAMY" },
    { name: "description", content: "Review your saved MAQAMY prayer-space collections and complete your purchase with secure payment." },
    { property: "og:title", content: "Your Cart — MAQAMY" },
    { property: "og:description", content: "Your selected MAQAMY prayer-space collections." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CartPage,
});

function CartPage() {
  const { order: returnedOrder, payment: returnedPayment } = Route.useSearch();
  const { cart, total, itemCount, userEmail, loading, updateQuantity, removeItem, signOut, reload } = useCart();
  const [placing, setPlacing] = useState(false);
  const [shopperProof, setShopperProof] = useState<string | null>(null);
  const { t, lang } = useLang();
  const [placed, setPlaced] = useState<string | null>(null);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);

  const placeOrder = async () => {
    if (!shopperProof) { toast.error(t("Complete shopper verification first.", "Lengkapkan pengesahan pembeli dahulu.")); return; }
    setPlacing(true);
    const { data, error } = await supabase.rpc("guarded_place_order", { _proof: shopperProof });
    if (error || !data) {
      setPlacing(false);
      toast.error(t("Your order could not be placed. Please try again.", "Pesanan anda tidak dapat dibuat. Sila cuba lagi."));
      return;
    }
    const orderNumber = data as string;
    const result = await createCheckoutSession({
      data: {
        orderNumber,
        returnUrl: `${window.location.origin}/cart?order=${orderNumber}&payment=returned&session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    setPlacing(false);
    if ("error" in result || !result.clientSecret) {
      setPlaced(orderNumber);
      toast.error(t("Your order was received, but payment could not begin. Please try paying again from your orders page.", "Pesanan anda diterima, tetapi pembayaran tidak dapat dimulakan. Sila cuba bayar semula dari halaman pesanan anda."));
      return;
    }
    setPlaced(orderNumber);
    setCheckoutSecret(result.clientSecret);
  };

  const returned = returnedOrder && returnedPayment === "returned";

  return (
    <main className="min-h-screen bg-brand-cream text-brand-forest">
      <PaymentTestModeBanner />
      <SiteHeader tone="dark" itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} />
      <section className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="type-label text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">{t("Your selection", "Pilihan anda")}</p>
          <h1 className="type-heading mt-4 font-display text-3xl font-light leading-tight sm:text-4xl">{t("The cart.", "Troli.")}</h1>
          <p className="type-body mt-6 max-w-xl text-sm leading-7 text-muted-foreground">{t("A considered overview of the prayer spaces you have selected for your home.", "Gambaran teliti ruang solat yang telah anda pilih untuk rumah anda.")}</p>
          {loading ? <div className="mx-auto my-24 h-12 w-1 animate-spin-bar bg-brand-gold" /> : returned ? (
            <OrderReturned orderNumber={returnedOrder ?? ""} />
          ) : checkoutSecret && placed ? (
            <div className="animate-fade-soft mt-14">
              <div className="mb-10 border-y border-brand-gold/25 py-10 text-center">
                <p className="type-label text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">{t("Order received", "Pesanan diterima")}</p>
                <h2 className="type-heading mt-4 font-display text-3xl font-light">{placed}</h2>
                <p className="type-body mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">{t("One step remains — complete your payment below to confirm the order.", "Tinggal satu langkah — lengkapkan pembayaran anda di bawah untuk mengesahkan pesanan.")}</p>
              </div>
              <div className="border border-brand-gold/25 bg-card p-4 shadow-gold sm:p-8">
                <StripeEmbeddedCheckout
                  fetchClientSecret={async () => checkoutSecret}
                />
              </div>
            </div>
          ) : placed ? (
            <OrderPlaced number={placed} />
          ) : !userEmail ? <SignedOut /> : cart.length === 0 ? <EmptyCart /> : (
            <div className="mt-14 grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-start">
              <div className="space-y-4">
                {cart.map((item) => (
                  <article key={item.id} className="grid gap-5 border border-brand-gold/25 bg-card p-5 shadow-gold sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
                    <div><p className="type-label text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">{t(`${item.package} edition`, `Edisi ${trWord(item.package, lang)}`)}</p><h2 className="type-heading mt-2 font-display text-4xl font-light">{item.collection}</h2><p className="mt-3 text-sm text-muted-foreground type-price">{formatRM(item.unit_price)} {item.package === "Bespoke" ? t("starting price", "harga permulaan") : t("per set", "setiap set")}</p></div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="flex items-center border border-brand-gold/25"><Button variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => void updateQuantity(item, item.quantity - 1)}><Minus /></Button><span className="type-body w-10 text-center text-sm font-bold">{item.quantity}</span><Button variant="ghost" size="icon" aria-label="Increase quantity" disabled={item.quantity >= 10} onClick={() => void updateQuantity(item, item.quantity + 1)}><Plus /></Button></div>
                      <p className="min-w-28 text-right font-bold type-price">{formatRM(item.unit_price * item.quantity)}{item.package === "Bespoke" ? "+" : ""}</p>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${item.collection} ${item.package}`} onClick={() => void removeItem(item.id)}><Trash2 /></Button>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="border border-brand-gold/30 bg-brand-forest p-6 text-brand-cream lg:sticky lg:top-8">
                <p className="type-label text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold-soft">{t("Summary", "Ringkasan")}</p>
                <div className="mt-8 flex items-baseline justify-between border-b border-brand-cream/20 pb-6"><span className="type-body text-sm">{t("Estimated total", "Anggaran jumlah")}</span><strong className="font-display text-4xl type-price">{formatRM(total)}+</strong></div>
                <p className="type-body mt-5 text-xs leading-6 text-brand-cream/70">{t("You will receive an order number instantly, then complete payment securely on this page. Our team reviews every order before it is prepared.", "Anda akan menerima nombor pesanan serta-merta, kemudian lengkapkan pembayaran dengan selamat di halaman ini. Pasukan kami menyemak setiap pesanan sebelum ia disediakan.")}</p>
                <div className="mt-6 bg-card p-4 text-foreground"><ShopperChallenge purpose="checkout" onVerified={setShopperProof} /></div>
                <Button variant="gold" size="lg" className="mt-8 w-full" disabled={placing || !shopperProof} onClick={() => void placeOrder()}>{placing ? t("Preparing payment…", "Menyediakan pembayaran…") : t("Place order & pay", "Buat pesanan & bayar")} <ArrowRight /></Button>
              </aside>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function SignedOut() { const { t } = useLang(); return <div className="mt-14 border-y border-brand-gold/25 py-20 text-center"><UserRound className="mx-auto size-9 text-brand-gold" /><h2 className="type-heading mt-5 font-display text-4xl font-light">{t("Your private cart begins with an account.", "Troli peribadi anda bermula dengan akaun.")}</h2><p className="type-body mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">{t("Register with your name, phone number, email, and address to save your selections.", "Daftar dengan nama, nombor telefon, e-mel dan alamat anda untuk menyimpan pilihan anda.")}</p><Button asChild variant="gold" size="lg" className="mt-7"><Link to="/auth" search={{ redirect: "/cart" }}>{t("Register or sign in", "Daftar atau log masuk")} <ArrowRight /></Link></Button></div>; }
function EmptyCart() { const { t } = useLang(); return <div className="mt-14 border-y border-brand-gold/25 py-20 text-center"><ShoppingBag className="mx-auto size-9 text-brand-gold" /><h2 className="type-heading mt-5 font-display text-4xl font-light">{t("Your cart is ready for a collection.", "Troli anda sedia untuk sebuah koleksi.")}</h2><Button asChild variant="maqamy" size="lg" className="mt-7"><Link to="/collections">{t("Explore Noor & Janna", "Terokai Noor & Janna")} <ArrowRight /></Link></Button></div>; }

function OrderPlaced({ number }: { number: string }) { const { t } = useLang(); return <div className="animate-fade-soft mt-14 border-y border-brand-gold/25 py-20 text-center"><p className="type-label text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">{t("Order received", "Pesanan diterima")}</p><h2 className="type-heading mt-5 font-display text-3xl font-light">{number}</h2><p className="type-body mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">{t("Thank you. Our team will review and approve your order shortly. Keep this number — you can follow every step on your orders page.", "Terima kasih. Pasukan kami akan menyemak dan meluluskan pesanan anda tidak lama lagi. Simpan nombor ini — anda boleh mengikuti setiap langkah di halaman pesanan anda.")}</p><Button asChild variant="gold" size="lg" className="mt-7"><Link to="/orders">{t("Track my orders", "Jejak pesanan saya")} <ArrowRight /></Link></Button></div>; }

function OrderReturned({ orderNumber }: { orderNumber: string }) { const { t } = useLang(); return <div className="animate-fade-soft mt-14 border-y border-brand-gold/25 py-20 text-center"><p className="type-label text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">{t("Payment complete", "Pembayaran selesai")}</p><h2 className="type-heading mt-5 font-display text-3xl font-light">{orderNumber}</h2><p className="type-body mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">{t("Thank you — your payment has been received and your order is now awaiting our team's approval. Keep this number — you can follow every step on your orders page.", "Terima kasih — pembayaran anda telah diterima dan pesanan anda kini menunggu kelulusan pasukan kami. Simpan nombor ini — anda boleh mengikuti setiap langkah di halaman pesanan anda.")}</p><Button asChild variant="gold" size="lg" className="mt-7"><Link to="/orders">{t("Track my orders", "Jejak pesanan saya")} <ArrowRight /></Link></Button></div>; }
