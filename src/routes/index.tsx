import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Menu,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import {
  brandAssets,
  collections,
  findPackage,
  formatRM,
  type CollectionName,
  type PackageName,
} from "@/lib/maqamy-products";

type CartItem = {
  id: string;
  collection: CollectionName;
  package: PackageName;
  quantity: number;
  unit_price: number;
};

const storyLines = [
  "In the rhythm of life, we often lose touch with stillness.",
  "Yet within every home lies the possibility of a sacred pause.",
  "A moment to breathe. A place to return.",
  "A space that gently reminds us of who we are — and why we are here.",
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MAQAMY — Sacred Prayer Spaces for the Home" },
      {
        name: "description",
        content: "Discover Noor and Janna, complete premium Islamic prayer-space collections designed in Malaysia for a more meaningful life.",
      },
      { property: "og:title", content: "MAQAMY — Prayer Spaces for a More Meaningful Life" },
      {
        property: "og:description",
        content: "Complete home prayer-space collections with a mihrab, prayer rug, side table, lighting, and considered accessories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaqamyStore,
});

function MaqamyStore() {
  const navigate = useNavigate();
  const [intro, setIntro] = useState(true);
  const [activeStory, setActiveStory] = useState(0);
  const [activeProduct, setActiveProduct] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const storyRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  const loadCart = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("cart_items")
      .select("id, collection, package, quantity, unit_price")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Your cart could not be loaded.");
      return;
    }
    setCart((data ?? []) as CartItem[]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      if (data.user) void loadCart(data.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUserEmail(session?.user.email ?? null);
      if (session?.user) void loadCart(session.user.id);
      else setCart([]);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadCart]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveStory(Number(entry.target.getAttribute("data-index") ?? 0));
        }
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0.1 },
    );
    storyRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  async function addToCart(collection: CollectionName, packageName: PackageName) {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      toast.info("Sign in or register to save your cart.");
      await navigate({ to: "/auth", search: { redirect: "/" } });
      return;
    }

    const selected = findPackage(collection, packageName);
    if (!selected) return;
    const existing = cart.find((item) => item.collection === collection && item.package === packageName);
    const quantity = Math.min((existing?.quantity ?? 0) + 1, 10);
    const payload = {
      user_id: authData.user.id,
      collection,
      package: packageName,
      quantity,
      unit_price: selected.price,
    };
    const { error } = await supabase.from("cart_items").upsert(payload, {
      onConflict: "user_id,collection,package",
    });
    if (error) {
      toast.error("This item could not be added.");
      return;
    }
    await loadCart(authData.user.id);
    setCartOpen(true);
    toast.success(`${collection} ${packageName} added to cart.`);
  }

  async function updateQuantity(item: CartItem, quantity: number) {
    if (quantity < 1) return removeItem(item.id);
    const { error } = await supabase.from("cart_items").update({ quantity: Math.min(quantity, 10) }).eq("id", item.id);
    if (error) {
      toast.error("Cart quantity could not be updated.");
      return;
    }
    setCart((items) => items.map((current) => (current.id === item.id ? { ...current, quantity } : current)));
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    if (error) {
      toast.error("This item could not be removed.");
      return;
    }
    setCart((items) => items.filter((item) => item.id !== id));
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setCart([]);
    toast.success("Signed out.");
  }

  if (intro) return <IntroScreen onSkip={() => setIntro(false)} />;

  return (
    <main className="overflow-hidden bg-background text-foreground">
      <SiteHeader
        itemCount={itemCount}
        userEmail={userEmail}
        mobileMenu={mobileMenu}
        setMobileMenu={setMobileMenu}
        cartOpen={cartOpen}
        setCartOpen={setCartOpen}
        cart={cart}
        total={total}
        onQuantity={updateQuantity}
        onRemove={removeItem}
        onSignOut={signOut}
      />

      <section className="relative min-h-[92svh] overflow-hidden bg-brand-forest text-brand-cream">
        <img src={brandAssets.desert} alt="A solitary tree in a quiet desert landscape" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-brand-forest/45" />
        <div className="relative mx-auto flex min-h-[92svh] max-w-7xl flex-col justify-end px-5 pb-20 pt-32 sm:px-8 lg:px-12 lg:pb-24">
          <p className="animate-rise-cut text-xs font-bold uppercase text-brand-gold-soft">Prayer spaces for a more meaningful life</p>
          <h1 className="animate-rise-cut mt-5 max-w-5xl font-display text-6xl font-semibold leading-[0.88] sm:text-8xl lg:text-[8.5rem]">
            A place to<br /><span className="italic text-brand-gold-soft">return.</span>
          </h1>
          <div className="mt-10 flex flex-col items-start gap-6 border-t border-brand-cream/30 pt-6 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-lg text-sm leading-7 text-brand-cream/80 sm:text-base">
              Complete prayer environments, created with intention for the spiritual centre of your home.
            </p>
            <Button asChild variant="gold" size="lg">
              <a href="#collections">Explore the collections <ArrowDown /></a>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-brand-mist px-5 py-20 sm:px-8 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase text-brand-gold">The intention</p>
            <h2 className="mt-4 font-display text-5xl font-semibold leading-[0.95] sm:text-7xl">More than a corner. A state of being.</h2>
          </div>
          <p className="border-l border-brand-gold/40 pl-6 text-lg leading-9 text-muted-foreground sm:text-xl">
            MAQAMY transforms an overlooked part of the home into a considered sanctuary — one that makes daily prayer feel present, natural and deeply personal.
          </p>
        </div>
      </section>

      <section className="bg-brand-cream px-5 py-24 sm:px-8 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.65fr_1.35fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="text-xs font-bold uppercase text-brand-gold">The quiet return</p>
            <p className="mt-4 max-w-xs text-sm leading-7 text-muted-foreground">Move through the words. Each thought is held in green as it enters focus.</p>
          </div>
          <div className="space-y-[30vh] py-[18vh]">
            {storyLines.map((line, index) => (
              <p
                key={line}
                ref={(node) => { storyRefs.current[index] = node; }}
                data-index={index}
                className={`text-balance font-display text-4xl font-semibold leading-[1.08] transition-colors duration-500 sm:text-6xl ${
                  activeStory === index ? "bg-highlight px-4 py-3 text-highlight-foreground sm:px-6" : "text-brand-forest/25"
                }`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section id="collections" className="bg-brand-forest px-5 py-20 text-brand-cream sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 border-b border-brand-cream/20 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-brand-gold-soft">Sakinah collection</p>
              <h2 className="mt-3 font-display text-5xl font-semibold sm:text-7xl">Two expressions of peace.</h2>
            </div>
            <div className="flex gap-2">
              <Button variant="cream" size="icon" aria-label="Previous collection" onClick={() => setActiveProduct((activeProduct + collections.length - 1) % collections.length)}><ChevronLeft /></Button>
              <Button variant="gold" size="icon" aria-label="Next collection" onClick={() => setActiveProduct((activeProduct + 1) % collections.length)}><ChevronRight /></Button>
            </div>
          </div>

          <div className="mt-10">
            <ProductSlide key={collections[activeProduct]?.name} index={activeProduct} onAdd={addToCart} />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {collections.map((collection, index) => (
              <Button
                key={collection.name}
                variant={activeProduct === index ? "gold" : "cream"}
                onClick={() => setActiveProduct(index)}
                className="h-auto justify-between px-4 py-4"
              >
                <span>{String(index + 1).padStart(2, "0")} — {collection.name}</span>
                <ArrowRight />
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="relative min-h-[75svh] bg-brand-forest text-brand-cream">
        <img src={brandAssets.prayerSpace} alt="A finished MAQAMY prayer space" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-brand-forest/55" />
        <div className="relative mx-auto flex min-h-[75svh] max-w-7xl flex-col justify-end px-5 py-20 sm:px-8 lg:px-12">
          <p className="text-xs font-bold uppercase text-brand-gold-soft">Designed in Malaysia · Inspired by Eternity</p>
          <h2 className="mt-4 max-w-4xl font-display text-5xl font-semibold leading-[0.96] sm:text-7xl">Create the space your prayers deserve.</h2>
          <Button asChild variant="gold" size="lg" className="mt-8 w-fit">
            {userEmail ? <a href="#collections">Choose your collection <ArrowRight /></a> : <Link to="/auth" search={{ redirect: "/" }}>Begin with an account <ArrowRight /></Link>}
          </Button>
        </div>
      </section>

      <footer className="bg-brand-ink px-5 py-10 text-brand-cream sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <img src={brandAssets.logo} alt="MAQAMY Living Concepts" className="w-28 brightness-0 invert" />
            <p className="mt-5 text-xs uppercase text-brand-cream/60">Maqamy Living Concepts © A-Z 2026</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/privacy" className="text-brand-cream/70 transition-colors hover:text-brand-gold-soft">Privacy policy</Link>
            <a href="#collections" className="text-brand-cream/70 transition-colors hover:text-brand-gold-soft">Collections</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function IntroScreen({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-brand-forest text-brand-cream">
      <Button variant="ghost" size="sm" onClick={onSkip} className="absolute right-5 top-5 text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream"><X /> Skip</Button>
      <div className="text-center">
        <img src={brandAssets.logo} alt="MAQAMY Living Concepts" className="mx-auto w-36 brightness-0 invert sm:w-44" />
        <div className="mx-auto mt-10 h-12 w-1 animate-spin-bar bg-brand-gold" aria-hidden="true" />
        <p className="mt-10 text-xs font-bold uppercase text-brand-gold-soft">A place to return</p>
      </div>
    </div>
  );
}

function SiteHeader({ itemCount, userEmail, mobileMenu, setMobileMenu, cartOpen, setCartOpen, cart, total, onQuantity, onRemove, onSignOut }: {
  itemCount: number;
  userEmail: string | null;
  mobileMenu: boolean;
  setMobileMenu: (open: boolean) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  cart: CartItem[];
  total: number;
  onQuantity: (item: CartItem, quantity: number) => void;
  onRemove: (id: string) => void;
  onSignOut: () => void;
}) {
  return (
    <header className="absolute inset-x-0 top-0 z-40 border-b border-brand-cream/20 text-brand-cream">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <a href="#top" aria-label="MAQAMY home"><img src={brandAssets.logo} alt="MAQAMY" className="w-24 brightness-0 invert" /></a>
        <nav className="hidden items-center gap-8 text-xs font-bold uppercase lg:flex">
          <a href="#collections" className="transition-colors hover:text-brand-gold-soft">Collections</a>
          <Link to="/privacy" className="transition-colors hover:text-brand-gold-soft">Privacy</Link>
        </nav>
        <div className="flex items-center gap-2">
          {userEmail ? (
            <Button variant="ghost" size="sm" onClick={onSignOut} className="hidden text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream sm:inline-flex"><LogOut /> Sign out</Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream sm:inline-flex"><Link to="/auth" search={{ redirect: "/" }}><LogIn /> Account</Link></Button>
          )}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild><Button variant="gold" size="icon" aria-label={`Open cart with ${itemCount} items`} className="relative"><ShoppingBag />{itemCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-brand-cream px-1 text-[10px] text-brand-forest">{itemCount}</span> : null}</Button></SheetTrigger>
            <CartSheet cart={cart} total={total} userEmail={userEmail} onQuantity={onQuantity} onRemove={onRemove} />
          </Sheet>
          <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)} className="text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream lg:hidden"><Menu /></Button>
        </div>
      </div>
      {mobileMenu ? (
        <div className="border-t border-brand-cream/20 bg-brand-forest px-5 py-5 lg:hidden">
          <div className="flex flex-col gap-4 text-sm font-semibold">
            <a href="#collections" onClick={() => setMobileMenu(false)}>Collections</a>
            <Link to="/privacy">Privacy policy</Link>
            {userEmail ? <Button variant="cream" onClick={onSignOut}><LogOut /> Sign out</Button> : <Button asChild variant="gold"><Link to="/auth" search={{ redirect: "/" }}><UserRound /> Register or sign in</Link></Button>}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function ProductSlide({ index, onAdd }: { index: number; onAdd: (collection: CollectionName, packageName: PackageName) => void }) {
  const collection = collections[index];
  if (!collection) return null;
  return (
    <article className="animate-rise-cut grid overflow-hidden border border-brand-cream/20 bg-brand-mist text-brand-forest lg:grid-cols-[0.84fr_1.16fr]">
      <div className="relative min-h-[430px] overflow-hidden lg:min-h-[860px]">
        <img src={collection.image} alt={collection.imageAlt} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-brand-forest/80 p-6 text-brand-cream backdrop-blur-sm">
          <p className="text-xs font-bold uppercase text-brand-gold-soft">{collection.subtitle}</p>
          <p className="mt-2 font-display text-3xl font-semibold italic">“{collection.quote}”</p>
        </div>
      </div>
      <div className="p-5 sm:p-8 lg:p-10">
        <p className="text-xs font-bold uppercase text-brand-gold">Collection {String(index + 1).padStart(2, "0")}</p>
        <h3 className="mt-3 font-display text-6xl font-semibold leading-none sm:text-8xl">{collection.name}</h3>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground">{collection.story}</p>
        <div className="mt-8 grid gap-6 border-y border-brand-gold/25 py-7 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-bold uppercase text-brand-gold">Details</p>
            <ul className="space-y-3 text-xs leading-5 text-muted-foreground">{collection.details.map((detail) => <li key={detail} className="flex gap-2"><Check className="mt-0.5 size-3 shrink-0 text-brand-gold" />{detail}</li>)}</ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase text-brand-gold">The collection</p>
            <ul className="space-y-3 text-xs leading-5 text-muted-foreground">{collection.collection.map((detail) => <li key={detail} className="flex gap-2"><Check className="mt-0.5 size-3 shrink-0 text-brand-gold" />{detail}</li>)}</ul>
          </div>
        </div>
        <div className="mt-7 grid gap-3 xl:grid-cols-3">
          {collection.packages.map((pack) => (
            <div key={pack.name} className={`relative flex min-h-[230px] flex-col border p-4 ${pack.badge ? "border-brand-gold bg-brand-cream" : "border-brand-gold/25 bg-card"}`}>
              {pack.badge ? <span className="absolute right-3 top-3 bg-brand-forest px-2 py-1 text-[9px] font-bold uppercase text-brand-cream">{pack.badge}</span> : null}
              <h4 className="font-display text-2xl font-semibold">{pack.name}</h4>
              <p className="mt-2 text-xl font-extrabold text-brand-gold">{pack.priceLabel}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{pack.includes.join(" · ")}</p>
              <Button variant={pack.badge ? "gold" : "maqamy"} className="mt-auto w-full" onClick={() => onAdd(collection.name, pack.name)}><ShoppingBag /> Add to cart</Button>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">Premium packaging includes a gift box, certificate of authenticity, and care card. Bespoke pricing begins at the displayed amount.</p>
      </div>
    </article>
  );
}

function CartSheet({ cart, total, userEmail, onQuantity, onRemove }: { cart: CartItem[]; total: number; userEmail: string | null; onQuantity: (item: CartItem, quantity: number) => void; onRemove: (id: string) => void }) {
  return (
    <SheetContent className="flex w-full flex-col border-brand-gold/25 bg-brand-mist p-0 text-brand-forest sm:max-w-md">
      <SheetHeader className="border-b border-brand-gold/25 p-6 pr-12">
        <SheetTitle className="font-display text-4xl font-semibold text-brand-forest">Your collection</SheetTitle>
        <SheetDescription>{userEmail ? `Saved to ${userEmail}` : "Sign in to create and save your cart."}</SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto p-5">
        {!userEmail ? (
          <div className="py-12 text-center"><UserRound className="mx-auto size-8 text-brand-gold" /><p className="mt-4 text-sm text-muted-foreground">Register with your name, phone number, email, and address to begin.</p><Button asChild variant="gold" className="mt-5"><Link to="/auth" search={{ redirect: "/" }}>Register or sign in</Link></Button></div>
        ) : cart.length === 0 ? (
          <div className="py-12 text-center"><ShoppingBag className="mx-auto size-8 text-brand-gold" /><p className="mt-4 text-sm text-muted-foreground">Your cart is waiting for a collection.</p></div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <article key={item.id} className="border border-brand-gold/25 bg-card p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-display text-2xl font-semibold">{item.collection}</p><p className="text-xs uppercase text-brand-gold">{item.package}</p></div><Button variant="ghost" size="icon" aria-label={`Remove ${item.collection} ${item.package}`} onClick={() => onRemove(item.id)}><Trash2 /></Button></div>
                <div className="mt-4 flex items-center justify-between gap-3"><div className="flex items-center border border-brand-gold/25"><Button variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => onQuantity(item, item.quantity - 1)}><Minus /></Button><span className="w-8 text-center text-sm font-bold">{item.quantity}</span><Button variant="ghost" size="icon" aria-label="Increase quantity" onClick={() => onQuantity(item, item.quantity + 1)} disabled={item.quantity >= 10}><Plus /></Button></div><p className="font-bold">{formatRM(item.unit_price * item.quantity)}{item.package === "Bespoke" ? "+" : ""}</p></div>
              </article>
            ))}
          </div>
        )}
      </div>
      {userEmail && cart.length > 0 ? <div className="border-t border-brand-gold/25 bg-brand-cream p-5"><div className="flex items-baseline justify-between"><span className="text-sm font-semibold">Estimated total</span><strong className="font-display text-3xl">{formatRM(total)}+</strong></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Final bespoke, delivery, and installation costs are confirmed during consultation.</p><Button variant="gold" size="lg" className="mt-5 w-full" onClick={() => toast.success("Your collection is saved. MAQAMY will use these details for purchase consultation.")}>Save for consultation <ArrowRight /></Button></div> : null}
    </SheetContent>
  );
}