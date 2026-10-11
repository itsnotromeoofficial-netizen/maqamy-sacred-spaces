import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { tr } from "@/lib/i18n";

import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;
  collection: string;
  package: string;
  quantity: number;
  unit_price: number;
};

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCart = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("cart_items")
      .select("id, collection, package, quantity, unit_price")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(tr("Your cart could not be loaded.", "Troli anda tidak dapat dimuatkan."));
      return;
    }
    setCart((data ?? []) as CartItem[]);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      if (data.user) void loadCart(data.user.id);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUserEmail(session?.user.email ?? null);
      if (session?.user) void loadCart(session.user.id);
      else setCart([]);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadCart]);

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0), [cart]);

  const addToCart = useCallback(async (collection: string, packageName: string) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;
    const { data: selected } = await supabase.from("products").select("price, stock").eq("collection", collection).eq("package", packageName).eq("active", true).maybeSingle();
    if (!selected || selected.stock < 1) { toast.error(tr("This product is currently out of stock.", "Produk ini kehabisan stok buat masa ini.")); return false; }
    const existing = cart.find((item) => item.collection === collection && item.package === packageName);
    const quantity = Math.min((existing?.quantity ?? 0) + 1, selected.stock, 10);
    const { error } = await supabase.from("cart_items").upsert({
      user_id: data.user.id,
      collection,
      package: packageName,
      quantity,
      unit_price: selected.price,
    }, { onConflict: "user_id,collection,package" });
    if (error) {
      toast.error(tr("This item could not be added.", "Item ini tidak dapat ditambah."));
      return false;
    }
    await loadCart(data.user.id);
    toast.success(tr(`${collection} ${packageName} added to cart.`, `${collection} ${packageName} ditambah ke troli.`));
    return true;
  }, [cart, loadCart]);

  const updateQuantity = useCallback(async (item: CartItem, quantity: number) => {
    if (quantity < 1) {
      const { error } = await supabase.from("cart_items").delete().eq("id", item.id);
      if (error) {
        toast.error(tr("This item could not be removed.", "Item ini tidak dapat dibuang."));
        return;
      }
      setCart((items) => items.filter((current) => current.id !== item.id));
      return;
    }
    const nextQuantity = Math.min(quantity, 10);
    const { error } = await supabase.from("cart_items").update({ quantity: nextQuantity }).eq("id", item.id);
    if (error) {
      toast.error(tr("Cart quantity could not be updated.", "Kuantiti troli tidak dapat dikemas kini."));
      return;
    }
    setCart((items) => items.map((current) => current.id === item.id ? { ...current, quantity: nextQuantity } : current));
  }, []);

  const removeItem = useCallback(async (id: string) => {
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    if (error) {
      toast.error(tr("This item could not be removed.", "Item ini tidak dapat dibuang."));
      return;
    }
    setCart((items) => items.filter((item) => item.id !== id));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    setCart([]);
    toast.success(tr("Signed out.", "Telah log keluar."));
  }, []);

  const reload = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) await loadCart(data.user.id);
  }, [loadCart]);

  return { cart, userEmail, loading, itemCount, total, addToCart, updateQuantity, removeItem, signOut, reload };
}