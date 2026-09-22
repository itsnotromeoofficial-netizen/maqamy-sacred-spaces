import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, ShoppingBag } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { Button } from "@/components/ui/button";
import { collections, type ProductCollection } from "@/lib/maqamy-products";
import { useCart } from "@/lib/use-cart";
import { useProducts, type CatalogueProduct } from "@/lib/use-products";

export const Route = createFileRoute("/collections")({
  head: () => ({ meta: [
    { title: "Noor & Janna Collections — MAQAMY" },
    { name: "description", content: "Explore the complete Noor and Janna premium Islamic prayer-space collections and their Essential, Signature, and Bespoke editions." },
    { property: "og:title", content: "Noor & Janna Collections — MAQAMY" },
    { property: "og:description", content: "Two complete prayer spaces, presented in full with every detail and package." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { itemCount, userEmail, addToCart, signOut } = useCart();
  const { products } = useProducts();
  return (
    <main className="bg-brand-mist text-brand-forest">
      <div className="bg-brand-forest"><SiteHeader itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} /></div>
      <section className="bg-brand-forest px-5 py-20 text-brand-cream sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase text-brand-gold-soft">Sakinah collection</p>
          <h1 className="mt-4 max-w-5xl font-display text-6xl font-semibold leading-[0.9] sm:text-8xl">Two expressions of peace.</h1>
          <p className="mt-8 max-w-xl text-sm leading-7 text-brand-cream/75">Noor and Janna are complete prayer environments, considered from the mihrab to the final object.</p>
        </div>
      </section>
      {collections.map((collection, index) => <CollectionChapter key={collection.name} collection={collection} products={products.filter((product) => product.collection === collection.name)} index={index} signedIn={Boolean(userEmail)} onAdd={addToCart} />)}
      {products.filter((product) => !collections.some((collection) => collection.name === product.collection)).length > 0 ? <AdditionalProducts products={products.filter((product) => !collections.some((collection) => collection.name === product.collection))} signedIn={Boolean(userEmail)} onAdd={addToCart} /> : null}
      <SiteFooter />
    </main>
  );
}

function CollectionChapter({ collection, products, index, signedIn, onAdd }: { collection: ProductCollection; products: CatalogueProduct[]; index: number; signedIn: boolean; onAdd: ReturnType<typeof useCart>["addToCart"] }) {
  return (
    <article className={index % 2 === 0 ? "bg-brand-mist" : "bg-brand-cream"}>
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <header className="grid gap-8 border-b border-brand-gold/30 pb-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div><p className="text-xs font-bold uppercase text-brand-gold">Collection {String(index + 1).padStart(2, "0")} · {collection.subtitle}</p><h2 className="mt-3 font-display text-7xl font-semibold leading-none sm:text-9xl">{collection.name}</h2></div>
          <div><p className="font-display text-3xl font-semibold italic">“{collection.quote}”</p><p className="mt-5 text-sm leading-7 text-muted-foreground">{collection.story}</p></div>
        </header>

        <figure className="mt-12 bg-card p-3 shadow-maqamy sm:p-6">
          <img src={collection.image} alt={collection.imageAlt} className="mx-auto block h-auto max-h-none w-full object-contain" />
          <figcaption className="border-t border-brand-gold/20 px-2 pb-1 pt-4 text-xs uppercase text-muted-foreground">The complete {collection.name} collection · shown in full</figcaption>
        </figure>

        <div className="mt-12 grid gap-10 border-y border-brand-gold/25 py-10 md:grid-cols-2">
          <DetailList title="Details" items={collection.details} />
          <DetailList title="The collection" items={collection.collection} />
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {collection.packages.map((fallback) => {
            const product = products.find((item) => item.package === fallback.name);
            const pack = product ? { ...fallback, price: product.price, priceLabel: `${new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(product.price)}${fallback.name === "Bespoke" ? "+" : ""}`, includes: product.specifications } : fallback;
            const stock = product?.stock ?? 0;
            return (
            <section key={pack.name} className={`relative flex min-h-[290px] flex-col border p-6 ${pack.badge ? "border-brand-gold bg-brand-cream shadow-gold" : "border-brand-gold/25 bg-card"}`}>
              {pack.badge ? <span className="absolute right-4 top-4 bg-brand-forest px-3 py-1 text-[9px] font-bold uppercase text-brand-cream">{pack.badge}</span> : null}
              <h3 className="font-display text-3xl font-semibold">{pack.name}</h3>
              <p className="mt-3 text-2xl font-extrabold text-brand-gold">{pack.priceLabel}</p>
              <p className="mt-5 text-xs leading-6 text-muted-foreground">{pack.includes.join(" · ")}</p>
              <p className={`mb-4 mt-auto text-xs font-bold uppercase ${stock > 0 ? "text-brand-gold" : "text-muted-foreground"}`}>{stock > 0 ? `${stock} available` : "Currently unavailable"}</p>
              {signedIn ? <Button variant={pack.badge ? "gold" : "maqamy"} className="w-full" disabled={stock < 1} onClick={() => void onAdd(collection.name, pack.name)}><ShoppingBag /> {stock > 0 ? "Add to cart" : "Out of stock"}</Button> : <Button asChild variant={pack.badge ? "gold" : "maqamy"} className="w-full" disabled={stock < 1}><Link to="/auth" search={{ redirect: "/collections" }}><ShoppingBag /> {stock > 0 ? "Sign in to add" : "Out of stock"}</Link></Button>}
            </section>
          );})}
        </div>
        <div className="mt-8 flex justify-end"><Button asChild variant="cream"><Link to="/cart">View full cart <ArrowRight /></Link></Button></div>
      </div>
    </article>
  );
}

function AdditionalProducts({ products, signedIn, onAdd }: { products: CatalogueProduct[]; signedIn: boolean; onAdd: ReturnType<typeof useCart>["addToCart"] }) {
  return <section className="bg-brand-cream px-5 py-20 sm:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase text-brand-gold">New additions</p><h2 className="mt-3 font-display text-6xl font-semibold">More from MAQAMY.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <article key={product.id} className="flex min-h-[360px] flex-col border border-brand-gold/25 bg-card p-6">{product.image_url ? <img src={product.image_url} alt={product.name} className="mb-6 aspect-[4/3] w-full object-contain" /> : null}<p className="text-xs font-bold uppercase text-brand-gold">{product.collection} · {product.package}</p><h3 className="mt-2 font-display text-4xl font-semibold">{product.name}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{product.description}</p><p className="mt-4 text-2xl font-extrabold text-brand-gold">{new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(product.price)}</p><p className="mb-4 mt-auto text-xs font-bold uppercase text-brand-gold">{product.stock > 0 ? `${product.stock} available` : "Currently unavailable"}</p>{signedIn ? <Button variant="maqamy" disabled={product.stock < 1} onClick={() => void onAdd(product.collection, product.package)}><ShoppingBag /> {product.stock > 0 ? "Add to cart" : "Out of stock"}</Button> : <Button asChild variant="maqamy" disabled={product.stock < 1}><Link to="/auth" search={{ redirect: "/collections" }}><ShoppingBag /> {product.stock > 0 ? "Sign in to add" : "Out of stock"}</Link></Button>}</article>)}</div></div></section>;
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return <div><p className="mb-5 text-xs font-bold uppercase text-brand-gold">{title}</p><ul className="space-y-4 text-sm leading-6 text-muted-foreground">{items.map((item) => <li key={item} className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-brand-gold" />{item}</li>)}</ul></div>;
}
