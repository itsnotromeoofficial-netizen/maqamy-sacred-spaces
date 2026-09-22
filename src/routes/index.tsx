import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { Button } from "@/components/ui/button";
import { brandAssets } from "@/lib/maqamy-products";
import { useCart } from "@/lib/use-cart";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "MAQAMY — A Place to Return" },
    { name: "description", content: "Enter MAQAMY, where complete prayer spaces are created with intention for the spiritual centre of the home." },
    { property: "og:title", content: "MAQAMY — A Place to Return" },
    { property: "og:description", content: "Prayer spaces for a more meaningful life, designed in Malaysia." },
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
      <Button variant="ghost" size="sm" onClick={() => setOpening(false)} className="absolute right-5 top-5 text-brand-cream"><X /> Skip</Button>
      <div className="text-center">
        <Button variant="ghost" className="h-auto p-2" aria-label="MAQAMY Living Concepts" onClick={handleLogoTap}><img src={brandAssets.logo} alt="MAQAMY Living Concepts" className="mx-auto w-36 brightness-0 invert sm:w-44" /></Button>
        <div className="mx-auto mt-10 h-12 w-1 animate-spin-bar bg-brand-gold" aria-hidden="true" />
        <p className="mt-10 text-xs font-bold uppercase text-brand-gold-soft">A place to return</p>
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
          <p className="animate-rise-cut text-xs font-bold uppercase text-brand-gold-soft">Prayer spaces for a more meaningful life</p>
          <h1 className="animate-rise-cut mt-5 max-w-5xl font-display text-6xl font-semibold leading-[0.88] sm:text-8xl lg:text-[8.5rem]">A place to<br /><span className="italic text-brand-gold-soft">return.</span></h1>
          <div className="mt-10 grid gap-6 border-t border-brand-cream/30 pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <p className="max-w-lg text-sm leading-7 text-brand-cream/80 sm:text-base">Complete prayer environments, created with intention for the spiritual centre of your home.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="cream" size="lg"><Link to="/story">Discover our intention <ArrowRight /></Link></Button>
              <Button asChild variant="gold" size="lg"><Link to="/collections">View collections <ArrowRight /></Link></Button>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
