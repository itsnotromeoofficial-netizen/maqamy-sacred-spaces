import type { ImgHTMLAttributes } from "react";

import { type SiteAssetKey, useSiteAsset } from "@/lib/site-assets";

export function SiteImg({ slot, ...props }: { slot: SiteAssetKey } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const src = useSiteAsset(slot);
  return <img src={src} {...props} />;
}
