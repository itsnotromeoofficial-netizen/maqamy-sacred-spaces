import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { Button } from "@/components/ui/button";
import { brandAssets } from "@/lib/maqamy-products";
import { useCart } from "@/lib/use-cart";

const storyLines = [
  "A place to pause, to surrender, and to remember what truly matters.",
  "A place where we can heal.",
  "A place where we can return to ourselves and to the One who created us.",
  "Not merely a place to live. A place to return.",
];

export const Route = createFileRoute("/story")({
  head: () => ({ meta: [
    { title: "Our Intention — MAQAMY" },
    { name: "description", content: "The MAQAMY intention: transforming an overlooked part of the home into a considered sanctuary." },
    { property: "og:title", content: "Our Intention — MAQAMY" },
    { property: "og:description", content: "Not merely a place to live. A place to return." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: StoryPage,
});

function StoryPage() {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLParagraphElement | null>>([]);
  const { itemCount, userEmail, signOut } = useCart();
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number(entry.target.getAttribute("data-index") ?? 0));
    }, { rootMargin: "-42% 0px -42% 0px", threshold: 0.1 });
    refs.current.forEach((node) => { if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="bg-brand-cream text-brand-forest">
      <div className="bg-brand-forest"><SiteHeader itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} /></div>
      <section className="grid min-h-[78svh] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-5 py-20 sm:px-8 lg:px-12">
          <p className="text-xs font-bold uppercase text-brand-gold">The intention</p>
          <h1 className="mt-5 max-w-xl font-display text-6xl font-semibold leading-[0.92] sm:text-8xl">More than a corner. A state of being.</h1>
          <p className="mt-8 max-w-lg text-base leading-8 text-muted-foreground">MAQAMY transforms an overlooked part of the home into a considered sanctuary — one that makes daily prayer feel present, natural and deeply personal.</p>
        </div>
        <div className="min-h-[55svh] bg-brand-mist p-5 sm:p-8 lg:p-12">
          <img src={brandAssets.prayerSpace} alt="A complete MAQAMY prayer space" className="h-full w-full object-contain" />
        </div>
      </section>
      <section className="px-5 py-24 sm:px-8 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.65fr_1.35fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-bold uppercase text-brand-gold">The quiet return</p>
            <h2 className="mt-4 font-display text-4xl font-semibold">Words to hold.</h2>
          </div>
          <div className="space-y-[30vh] py-[15vh]">
            {storyLines.map((line, index) => <p key={line} ref={(node) => { refs.current[index] = node; }} data-index={index} className={`text-balance font-display text-4xl font-semibold leading-[1.08] transition-colors duration-500 sm:text-6xl ${active === index ? "bg-highlight px-4 py-3 text-highlight-foreground sm:px-6" : "text-brand-forest/25"}`}>{line}</p>)}
          </div>
        </div>
      </section>
      <section className="bg-brand-forest px-5 py-20 text-brand-cream sm:px-8 lg:py-28">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-3xl font-display text-5xl font-semibold leading-none sm:text-7xl">Meet the spaces shaped by this intention.</h2>
          <Button asChild variant="gold" size="lg"><Link to="/collections">Explore Noor & Janna <ArrowRight /></Link></Button>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
