import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { Button } from "@/components/ui/button";
import { brandAssets } from "@/lib/maqamy-products";
import { useCart } from "@/lib/use-cart";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "MAQAMY — A Space for the Heart to Be Present" },
    { name: "description", content: "A Malaysian design house inspired by Ḥuḍūr al-Qalb, creating thoughtful furnishings and spaces for the presence of the heart." },
    { property: "og:title", content: "MAQAMY — A Space for the Heart to Be Present" },
    { property: "og:description", content: "Devotion cannot be designed, but its essence can be invited and nurtured through thoughtful spaces." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: IntroductionPage,
});

function IntroductionPage() {
  const [opening, setOpening] = useState(true);
  const navigate = useNavigate();
  const tapCount = useRef(0);
  const tapTimer = useRef(0);
  const { itemCount, userEmail, signOut } = useCart();
  const { t } = useLang();
  useEffect(() => {
    const timer = window.setTimeout(() => setOpening(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  const handleLogoTap = () => {
    window.clearTimeout(tapTimer.current);
    tapCount.current += 1;
    if (tapCount.current === 3) {
      tapCount.current = 0;
      void navigate({ to: "/admin" });
      return;
    }
    tapTimer.current = window.setTimeout(() => { tapCount.current = 0; }, 900);
  };

  if (opening) return (
    <main className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-brand-forest text-brand-cream">
      <Button variant="ghost" size="sm" onClick={() => setOpening(false)} className="absolute right-5 top-5 text-brand-cream"><X /> {t("Skip", "Langkau")}</Button>
      <div className="text-center">
        <Button variant="ghost" className="h-auto p-2" aria-label="MAQAMY Living Concepts" onClick={handleLogoTap}><img src={brandAssets.logo} alt="MAQAMY Living Concepts" className="mx-auto w-36 brightness-0 invert sm:w-44" /></Button>
        <div className="mx-auto mt-10 h-12 w-1 animate-spin-bar bg-brand-gold" aria-hidden="true" />
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold-soft">{t("A place to return", "Tempat untuk kembali")}</p>
      </div>
    </main>
  );

  return (
    <main className="bg-brand-forest text-brand-cream">
      <section className="relative min-h-screen overflow-hidden">
        <img src={brandAssets.desert} alt="A solitary tree in a quiet desert landscape" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-brand-forest/45" />
        <div className="absolute inset-x-0 top-0"><SiteHeader itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} /></div>
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-5 pb-14 pt-32 sm:px-8 lg:px-12 lg:pb-20">
          <p className="animate-rise-cut max-w-2xl text-xs font-semibold uppercase leading-6 text-brand-gold-soft">{t("Inspired by the Islamic understanding of Ḥuḍūr al-Qalb", "Diilhamkan oleh pemahaman Islam tentang Ḥuḍūr al-Qalb")}</p>
          <h1 className="animate-rise-cut mt-5 max-w-5xl text-balance font-display text-5xl font-light leading-[1.05] sm:text-7xl lg:text-8xl">{t("A Space for the Heart", "Ruang untuk Hati")}<br /><span className="italic text-brand-gold-soft">{t("to Be Present.", "Hadir.")}</span></h1>
          <div className="mt-10 grid gap-6 border-t border-brand-cream/30 pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <p className="max-w-lg text-sm leading-7 text-brand-cream/80 sm:text-base">{t("Devotion cannot be designed, but its essence can be invited and nurtured through thoughtful spaces.", "Pengabdian tidak boleh direka, namun intipatinya dapat diundang dan dipupuk melalui ruang yang dirancang dengan teliti.")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="cream" size="lg"><Link to="/story">{t("Discover our intention", "Kenali niat kami")} <ArrowRight /></Link></Button>
              <Button asChild variant="gold" size="lg"><Link to="/collections">{t("View collections", "Lihat koleksi")} <ArrowRight /></Link></Button>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
