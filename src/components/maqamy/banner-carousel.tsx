import { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Banner = Tables<"banners">;
const IMAGE_MS = 5000;

export function useBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    void supabase.from("banners").select("*").eq("active", true).order("display_order").then(({ data }) => setBanners(data ?? []));
  }, []);
  return banners;
}

export function BannerCarousel({ banners, tone = "light" }: { banners: Banner[]; tone?: "light" | "dark" }) {
  const [index, setIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const timer = useRef(0);
  const videos = useRef(new Map<string, HTMLVideoElement>());
  const count = banners.length;
  const current = banners[index % Math.max(count, 1)];

  const next = () => setIndex((value) => (value + 1) % count);

  // Browsers block autoplay-with-sound until the visitor interacts once;
  // the first tap/scroll/keypress anywhere unmutes the current video.
  useEffect(() => {
    const enable = () => setSoundOn(true);
    window.addEventListener("pointerdown", enable, { once: true });
    window.addEventListener("keydown", enable, { once: true });
    window.addEventListener("touchstart", enable, { once: true });
    return () => {
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("keydown", enable);
      window.removeEventListener("touchstart", enable);
    };
  }, []);

  useEffect(() => {
    for (const video of videos.current.values()) video.muted = !soundOn;
  }, [soundOn, index]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!current) return;
    if (current.kind === "image") timer.current = window.setTimeout(next, IMAGE_MS);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count]);

  if (!count || !current) return null;
  const dark = tone === "dark";

  return (
    <section aria-label="Featured" className={`relative overflow-hidden ${dark ? "bg-brand-cream" : "bg-brand-ink"}`}>
      <div className="relative mx-auto aspect-[16/9] max-h-[70vh] w-full max-w-[1440px] sm:aspect-[21/9]">
        {banners.map((banner, i) => {
          const active = i === index % count;
          return (
            <div
              key={banner.id}
              className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(${(i - (index % count)) * 100}%)` }}
              aria-hidden={!active}
            >
              {banner.kind === "video" ? (
                <video
                  src={banner.url}
                  className="h-full w-full object-cover"
                  muted={!soundOn}
                  playsInline
                  autoPlay={active}
                  onEnded={next}
                  ref={(el) => {
                    if (!el) { videos.current.delete(banner.id); return; }
                    videos.current.set(banner.id, el);
                    el.muted = !soundOn;
                    if (active) { el.currentTime = 0; void el.play().catch(() => undefined); }
                  }}
                />
              ) : (
                <img src={banner.url} alt={banner.title || "MAQAMY feature"} className="h-full w-full object-cover" />
              )}
              {banner.title ? (
                <p className={`absolute bottom-5 left-5 text-[10px] font-semibold uppercase tracking-[0.35em] sm:left-8 ${dark ? "text-brand-forest" : "text-brand-cream"}`}>{banner.title}</p>
              ) : null}
            </div>
          );
        })}
        {current.kind === "video" ? (
          <button
            type="button"
            aria-label={soundOn ? "Mute video sound" : "Turn video sound on"}
            onClick={() => setSoundOn((on) => !on)}
            className={`absolute bottom-4 left-5 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-all duration-300 sm:left-8 ${dark ? "bg-brand-forest/10 text-brand-forest hover:bg-brand-forest/20" : "bg-brand-cream/15 text-brand-cream hover:bg-brand-cream/30"}`}
          >
            {soundOn ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" /></svg>
            )}
          </button>
        ) : null}
        {count > 1 ? (
          <div className="absolute bottom-4 right-5 flex gap-1.5 sm:right-8">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1 rounded-full transition-all duration-500 ${i === index % count ? "w-6 bg-brand-gold" : `w-2 ${dark ? "bg-brand-forest/30" : "bg-brand-cream/40"}`}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
