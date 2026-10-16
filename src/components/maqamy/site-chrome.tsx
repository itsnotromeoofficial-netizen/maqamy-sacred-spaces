import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { brandAssets } from "@/lib/maqamy-products";
import { useLang } from "@/lib/i18n";
import { LanguageToggle } from "@/components/maqamy/language-picker";

export function SiteHeader({ itemCount = 0, userEmail, onSignOut, tone = "light" }: {
  itemCount?: number;
  userEmail?: string | null;
  onSignOut?: () => void;
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const navigate = useNavigate();
  const logoTaps = useRef(0);
  const logoTimer = useRef(0);
  const light = tone === "light";
  const textClass = light ? "text-brand-cream" : "text-brand-forest";
  const borderClass = light ? "border-brand-cream/20" : "border-brand-gold/25";
  const onLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    window.clearTimeout(logoTimer.current);
    logoTaps.current += 1;
    if (logoTaps.current === 3) {
      event.preventDefault();
      logoTaps.current = 0;
      void navigate({ to: "/admin" });
      return;
    }
    logoTimer.current = window.setTimeout(() => { logoTaps.current = 0; }, 900);
  };
  return (
    <header className={`relative z-40 border-b ${borderClass} ${textClass}`}>
      <div className="mx-auto grid h-28 max-w-[1440px] grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 px-5 sm:h-32 sm:px-8 lg:h-40 lg:grid-cols-[1fr_auto_1fr] lg:gap-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-5">
          <Button variant="ghost" size="icon" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)} className={`${textClass} lg:hidden`}>{open ? <X /> : <Menu />}</Button>
          <div className="hidden lg:block"><LanguageToggle /></div>
          {userEmail ? (
            <Button variant="ghost" size="sm" onClick={onSignOut} className={`hidden lg:inline-flex ${textClass}`}><LogOut /> {t("Sign out", "Log keluar")}</Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className={`hidden lg:inline-flex ${textClass}`}><Link to="/auth" search={{ redirect: "/collections" }}><UserRound /> {t("Account", "Akaun")}</Link></Button>
          )}
        </div>
        <Link to="/" aria-label="MAQAMY introduction" onClick={onLogoClick} className="mx-auto block w-full max-w-48 sm:max-w-64 lg:w-80 lg:max-w-none">
          <img src={brandAssets.logo} alt="MAQAMY" className={`h-auto w-full ${light ? "brightness-0 invert" : ""}`} />
        </Link>
        <div className="flex justify-end">
          <Button asChild variant="ghost" className={`h-10 w-10 shrink-0 px-0 lg:w-auto lg:gap-3 lg:px-3 ${textClass}`} aria-label={`Cart with ${itemCount} items`}>
            <Link to="/cart"><ShoppingBag /><span className="hidden lg:inline">{t("Cart", "Troli")}{itemCount > 0 ? ` · ${itemCount}` : ""}</span>{itemCount > 0 ? <span className="text-[10px] lg:hidden">{itemCount}</span> : null}</Link>
          </Button>
        </div>
      </div>
      <div className={`border-t ${borderClass}`}>
        <nav className="mx-auto hidden h-14 max-w-7xl items-center justify-center gap-12 text-xs font-semibold uppercase lg:flex">
          <Link to="/story" activeProps={{ className: "text-brand-gold-soft" }}>{t("Our story", "Kisah kami")}</Link>
          <Link to="/collections" activeProps={{ className: "text-brand-gold-soft" }}>{t("Collections", "Koleksi")}</Link>
          <Link to="/cart" activeProps={{ className: "text-brand-gold-soft" }}>{t("Cart", "Troli")}</Link>
          <Link to="/orders" activeProps={{ className: "text-brand-gold-soft" }}>{t("My orders", "Pesanan saya")}</Link>
          <Link to="/privacy" activeProps={{ className: "text-brand-gold-soft" }}>{t("Privacy", "Privasi")}</Link>
        </nav>
        <div className="flex h-11 items-center justify-between px-5 sm:px-8 lg:hidden">
          <LanguageToggle />
          {userEmail ? (
            <Button variant="ghost" size="sm" onClick={onSignOut} className={textClass}><LogOut /> {t("Sign out", "Log keluar")}</Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className={textClass}><Link to="/auth" search={{ redirect: "/collections" }}><UserRound /> {t("Account", "Akaun")}</Link></Button>
          )}
        </div>
      </div>
      {open ? (
        <nav className={`border-t ${borderClass} ${light ? "bg-brand-forest" : "bg-brand-cream"} px-5 py-6 lg:hidden`}>
          <div className="flex flex-col gap-5 text-sm font-semibold">
            <Link to="/story" onClick={() => setOpen(false)}>{t("Our story", "Kisah kami")}</Link>
            <Link to="/collections" onClick={() => setOpen(false)}>{t("Collections", "Koleksi")}</Link>
            <Link to="/cart" onClick={() => setOpen(false)}>{t("Cart", "Troli")}</Link>
            <Link to="/orders" onClick={() => setOpen(false)}>{t("My orders", "Pesanan saya")}</Link>
            <Link to="/privacy" onClick={() => setOpen(false)}>{t("Privacy policy", "Dasar privasi")}</Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLang();
  return (
    <footer className="bg-brand-ink px-5 py-10 text-brand-cream sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-center sm:text-left">
          <img src={brandAssets.logo} alt="MAQAMY Living Concepts" className="mx-auto w-48 brightness-0 invert sm:mx-0" />
          <p className="mt-5 text-xs uppercase text-brand-cream/60">MAQAMY Living Concepts © 2026</p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-brand-cream/70">
          <Link to="/story">{t("Our story", "Kisah kami")}</Link><Link to="/collections">{t("Collections", "Koleksi")}</Link><Link to="/cart">{t("Cart", "Troli")}</Link><Link to="/orders">{t("My orders", "Pesanan saya")}</Link><Link to="/privacy">{t("Privacy", "Privasi")}</Link>
        </div>
      </div>
    </footer>
  );
}