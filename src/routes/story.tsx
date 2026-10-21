import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { Button } from "@/components/ui/button";
import { brandAssets } from "@/lib/maqamy-products";
import { useCart } from "@/lib/use-cart";
import { useLang } from "@/lib/i18n";
import { brandStory } from "@/lib/brand-story";

export const Route = createFileRoute("/story")({
  head: () => ({ meta: [
    { title: "The MAQAMY Story — Designed for the Presence of the Heart" },
    { name: "description", content: "Discover MAQAMY, a Malaysian design house bringing together design excellence, cultural identity and spiritual meaning through mindful living." },
    { property: "og:title", content: "The MAQAMY Story — Designed for the Presence of the Heart" },
    { property: "og:description", content: "Contemporary Islamic living, rooted in Malaysia and inspired by Ḥuḍūr al-Qalb — the presence of the heart." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: StoryPage,
});

function StoryPage() {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLParagraphElement | null>>([]);
  const { itemCount, userEmail, signOut } = useCart();
  const { t } = useLang();
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number(entry.target.getAttribute("data-index") ?? 0));
    }, { rootMargin: "-20% 0px -20% 0px", threshold: 0.25 });
    refs.current.forEach((node) => { if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="bg-brand-cream text-brand-forest">
      <div className="bg-brand-forest"><SiteHeader itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} /></div>
      <section className="grid min-h-[78svh] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-5 py-20 sm:px-8 lg:pl-[max(3rem,calc((100vw-80rem)/2+3rem))] lg:pr-12">
          <p className="type-label text-xs font-semibold uppercase text-brand-gold">{t("Malaysian design house", "Rumah reka bentuk Malaysia")}</p>
          <h1 className="type-heading mt-5 max-w-xl font-display text-3xl font-light leading-[1.1] sm:text-4xl">{t("The MAQAMY Story", "Kisah MAQAMY")}</h1>
          <p className="type-body mt-8 max-w-lg font-display text-2xl italic leading-8 text-muted-foreground">{t("Designed for the presence of the heart.", "Direka untuk kehadiran hati.")}</p>
        </div>
        <div className="min-h-[55svh] bg-brand-mist p-5 sm:p-8 lg:p-12">
          <img src={brandAssets.prayerSpace} alt="A complete MAQAMY prayer space" className="h-full w-full object-contain" />
        </div>
      </section>
      <section className="px-5 py-24 sm:px-8 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.65fr_1.35fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="type-label text-xs font-semibold uppercase text-brand-gold">{t("Our philosophy", "Falsafah kami")}</p>
            <h2 className="type-heading mt-4 font-display text-4xl font-light">Ḥuḍūr al-Qalb</h2>
            <p className="type-body mt-4 text-base text-muted-foreground">{t("The presence of the heart.", "Kehadiran hati.")}</p>
          </div>
          <div className="space-y-16">
            {brandStory.map((paragraph, index) => <p key={index} ref={(node) => { refs.current[index] = node; }} data-index={index} className={`type-storyBody px-5 py-6 text-lg leading-9 transition-colors duration-500 sm:px-8 sm:text-2xl sm:leading-10 ${active === index ? "bg-highlight text-highlight-foreground" : "text-muted-foreground"}`}>{t(paragraph.en, paragraph.ms)}</p>)}
          </div>
        </div>
      </section>
      <section className="bg-brand-forest px-5 py-20 text-brand-cream sm:px-8 lg:py-28">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="type-heading max-w-3xl font-display text-2xl font-light leading-tight sm:text-3xl">{t("MAQAMY — Designed for the presence of the heart.", "MAQAMY — Direka untuk kehadiran hati.")}</h2>
          <Button asChild variant="gold" size="lg"><Link to="/collections">{t("Explore Noor & Janna", "Terokai Noor & Janna")} <ArrowRight /></Link></Button>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
