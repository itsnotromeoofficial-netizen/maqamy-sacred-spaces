import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut, Menu, ShoppingBag, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { brandAssets } from "@/lib/maqamy-products";

export function SiteHeader({ itemCount = 0, userEmail, onSignOut, tone = "light" }: {
  itemCount?: number;
  userEmail?: string | null;
  onSignOut?: () => void;
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
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
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link to="/" aria-label="MAQAMY introduction" onClick={onLogoClick}>
          <img src={brandAssets.logo} alt="MAQAMY" className={`w-24 ${light ? "brightness-0 invert" : ""}`} />
        </Link>
        <nav className="hidden items-center gap-9 text-xs font-bold uppercase lg:flex">
          <Link to="/story" activeProps={{ className: "text-brand-gold-soft" }}>Our story</Link>
          <Link to="/collections" activeProps={{ className: "text-brand-gold-soft" }}>Collections</Link>
          <Link to="/cart" activeProps={{ className: "text-brand-gold-soft" }}>Cart</Link>
          <Link to="/privacy" activeProps={{ className: "text-brand-gold-soft" }}>Privacy</Link>
        </nav>
        <div className="flex items-center gap-2">
          {userEmail ? (
            <Button variant="ghost" size="sm" onClick={onSignOut} className={`hidden sm:inline-flex ${textClass}`}><LogOut /> Sign out</Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className={`hidden sm:inline-flex ${textClass}`}><Link to="/auth" search={{ redirect: "/collections" }}><LogIn /> Account</Link></Button>
          )}
          <Button asChild variant="gold" size="icon" className="relative" aria-label={`Cart with ${itemCount} items`}>
            <Link to="/cart"><ShoppingBag />{itemCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-brand-cream px-1 text-[10px] text-brand-forest">{itemCount}</span> : null}</Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)} className={`${textClass} lg:hidden`}>{open ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {open ? (
        <nav className={`border-t ${borderClass} ${light ? "bg-brand-forest" : "bg-brand-cream"} px-5 py-6 lg:hidden`}>
          <div className="flex flex-col gap-5 text-sm font-semibold">
            <Link to="/story" onClick={() => setOpen(false)}>Our story</Link>
            <Link to="/collections" onClick={() => setOpen(false)}>Collections</Link>
            <Link to="/cart" onClick={() => setOpen(false)}>Cart</Link>
            <Link to="/privacy" onClick={() => setOpen(false)}>Privacy policy</Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-brand-ink px-5 py-10 text-brand-cream sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <img src={brandAssets.logo} alt="MAQAMY Living Concepts" className="w-28 brightness-0 invert" />
          <p className="mt-5 text-xs uppercase text-brand-cream/60">MAQAMY Living Concepts © 2026</p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-brand-cream/70">
          <Link to="/story">Our story</Link><Link to="/collections">Collections</Link><Link to="/cart">Cart</Link><Link to="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}