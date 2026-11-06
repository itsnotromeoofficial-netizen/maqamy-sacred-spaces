import { useEffect, useSyncExternalStore } from "react";

import { supabase } from "@/integrations/supabase/client";
import { brandAssets, collections } from "@/lib/maqamy-products";

/** Every replaceable website image, with its built-in default. */
export const SITE_ASSET_SLOTS = [
  { key: "logo", label: "MAQAMY logo (header, footer, sign-in, home)", fallback: brandAssets.logo },
  { key: "home", label: "Home page background", fallback: brandAssets.desert },
  { key: "story", label: "Story / About us page image", fallback: brandAssets.prayerSpace },
  { key: "auth", label: "Sign-in & register page image", fallback: brandAssets.auth },
  { key: "noor", label: "Noor collection product image", fallback: collections[0]!.image },
  { key: "janna", label: "Janna collection product image", fallback: collections[1]!.image },
] as const;

export type SiteAssetKey = (typeof SITE_ASSET_SLOTS)[number]["key"];

let overrides: Record<string, string> = {};
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function refreshSiteAssets() {
  const { data } = await supabase.from("site_assets").select("key, url");
  overrides = Object.fromEntries((data ?? []).map((row) => [row.key, row.url]));
  loaded = true;
  emit();
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const snapshot = () => overrides;
const serverSnapshot = () => ({}) as Record<string, string>;

export function siteAssetFallback(key: SiteAssetKey) {
  return SITE_ASSET_SLOTS.find((s) => s.key === key)!.fallback;
}

/** Returns the owner-replaced image for a slot, or the built-in default. */
export function useSiteAsset(key: SiteAssetKey): string {
  const map = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => { if (!loaded) { loaded = true; void refreshSiteAssets(); } }, []);
  return map[key] || siteAssetFallback(key);
}
