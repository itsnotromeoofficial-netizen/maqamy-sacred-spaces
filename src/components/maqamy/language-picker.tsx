import { brandAssets } from "@/lib/maqamy-products";
import { setLang, useLang, useLangChosen } from "@/lib/i18n";

export function LanguagePicker() {
  const chosen = useLangChosen();
  if (chosen) return null;
  return (
    <div className="animate-fade-soft fixed inset-0 z-[100] flex items-center justify-center bg-brand-forest/90 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Choose your language">
      <div className="w-full max-w-md border border-brand-gold/30 bg-brand-cream p-8 text-center text-brand-forest shadow-maqamy sm:p-10">
        <img src={brandAssets.logo} alt="MAQAMY" className="mx-auto w-24" />
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.4em] text-brand-gold">Language · Bahasa</p>
        <h2 className="mt-4 font-display text-3xl font-light leading-tight">Choose your language<br /><span className="italic">Pilih bahasa anda</span></h2>
        <div className="mt-8 grid gap-3">
          <button type="button" onClick={() => setLang("en")} className="border border-brand-forest/20 px-5 py-4 font-display text-2xl transition-colors hover:border-brand-forest hover:bg-brand-mist">English</button>
          <button type="button" onClick={() => setLang("ms")} className="border border-brand-forest/20 px-5 py-4 font-display text-2xl transition-colors hover:border-brand-forest hover:bg-brand-mist">Bahasa Melayu</button>
        </div>
      </div>
    </div>
  );
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang } = useLang();
  return (
    <div className={`flex items-center text-[10px] font-semibold uppercase tracking-[0.2em] ${className}`} role="group" aria-label="Language">
      <button type="button" onClick={() => setLang("en")} className={`px-1.5 py-1 transition-opacity ${lang === "en" ? "opacity-100" : "opacity-50 hover:opacity-80"}`}>EN</button>
      <span className="opacity-40">/</span>
      <button type="button" onClick={() => setLang("ms")} className={`px-1.5 py-1 transition-opacity ${lang === "ms" ? "opacity-100" : "opacity-50 hover:opacity-80"}`}>BM</button>
    </div>
  );
}
