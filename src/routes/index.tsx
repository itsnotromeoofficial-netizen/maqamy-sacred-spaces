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
        <Button variant="ghost" className="h-auto p-2" aria-label="MAQAMY Living Concepts" onClick={handleLogoTap}><img src={brandAssets.logo} alt="MAQAMY Living Concepts" className="mx-auto w-60 brightness-0 invert sm:w-80" /></Button>
        <div className="mx-auto mt-10 h-12 w-1 animate-spin-bar bg-brand-gold" aria-hidden="true" />
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold-soft">{t("A place to return", "Tempat untuk kembali")}</p>
      </div>
    </main>
  );

  return (
    <main className="bg-brand-forest text-brand-cream">
      <div className="bg-brand-cream"><SiteHeader tone="dark" itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} /></div>
      <section className="maqamy-introduction relative overflow-hidden">
        <img src={brandAssets.desert} alt="A solitary tree in a quiet desert landscape" className="maqamy-landscape absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-brand-forest/45" />
        <div className="maqamy-introduction relative mx-auto flex max-w-7xl flex-col items-center justify-center px-5 py-14 text-center sm:px-8 lg:px-12 lg:py-20">
          <p className="animate-fade-soft max-w-2xl text-xs font-semibold uppercase leading-6 text-brand-gold-soft">{t("Inspired by the Islamic understanding of Ḥuḍūr al-Qalb", "Diilhamkan oleh pemahaman Islam tentang Ḥuḍūr al-Qalb")}</p>
          <h1 className="maqamy-arrival mt-5 max-w-5xl text-balance font-display text-5xl font-light leading-[1.12] sm:text-6xl lg:text-7xl">{t("A Space for the Heart", "Ruang untuk Hati")}<br /><span className="italic text-brand-gold-soft">{t("to Be Present.", "Hadir.")}</span></h1>
          <div className="maqamy-arrival-late mt-7 flex w-full flex-col items-center gap-7 lg:mt-9">
            <p className="max-w-lg text-sm leading-7 text-brand-cream/90 sm:text-base">{t("Devotion cannot be designed, but its essence can be invited and nurtured through thoughtful spaces.", "Pengabdian tidak boleh direka, namun intipatinya dapat diundang dan dipupuk melalui ruang yang dirancang dengan teliti.")}</p>
            <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
              <Button asChild variant="gold" size="lg" className="group rounded-none"><Link to="/collections">{t("View collections", "Lihat koleksi")} <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link></Button>
              <Button asChild variant="cream" size="lg" className="group rounded-none"><Link to="/story">{t("Discover our intention", "Kenali niat kami")} <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link></Button>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
