import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CatalogueProduct = Tables<"products">;

export function useProducts() {
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("products").select("*").eq("active", true).order("display_order");
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { products, loading, refresh };
}