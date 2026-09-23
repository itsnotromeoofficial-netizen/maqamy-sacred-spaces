import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { Button } from "@/components/ui/button";
import { collections, formatRM, type ProductCollection } from "@/lib/maqamy-products";
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
  const extras = products.filter((product) => !collections.some((collection) => collection.name === product.collection));

  return (
    <main className="bg-brand-cream text-brand-forest">
      <SiteHeader itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} tone="dark" />

      <section className="px-5 pb-16 pt-20 sm:px-8 lg:px-12 lg:pb-24 lg:pt-28">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-brand-gold">Sakinah</p>
          <h1 className="mt-8 font-display text-5xl font-normal italic leading-[1.05] sm:text-7xl">Two expressions of peace</h1>
          <p className="mx-auto mt-8 max-w-md text-sm leading-8 text-muted-foreground">
            Complete prayer environments, considered from the mihrab to the final object.
          </p>
        </div>
      </section>

      {collections.map((collection, index) => (
        <CollectionChapter
          key={collection.name}
          collection={collection}
          products={products.filter((product) => product.collection === collection.name)}
          index={index}
          signedIn={Boolean(userEmail)}
          onAdd={addToCart}
        />
      ))}

      {extras.length > 0 ? <AdditionalProducts products={extras} signedIn={Boolean(userEmail)} onAdd={addToCart} /> : null}

      <SiteFooter />
    </main>
  );
}

function CollectionChapter({ collection, products, index, signedIn, onAdd }: {
  collection: ProductCollection;
  products: CatalogueProduct[];
  index: number;
  signedIn: boolean;
  onAdd: ReturnType<typeof useCart>["addToCart"];
}) {
  return (
    <article className="border-t border-brand-forest/10">
      <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-32">
        <div className="mb-14 flex flex-col items-center gap-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-brand-gold">
            {String(index + 1).padStart(2, "0")} — {collection.subtitle}
          </p>
          <h2 className="font-display text-6xl font-normal uppercase leading-none sm:text-8xl">{collection.name}</h2>
        </div>

        <figure className="mx-auto max-w-5xl">
          <img src={collection.image} alt={collection.imageAlt} className="mx-auto block h-auto w-full object-contain" />
        </figure>

        <div className="mx-auto mt-16 max-w-3xl text-center">
          <p className="font-display text-3xl font-normal italic leading-snug sm:text-4xl">“{collection.quote}”</p>
          <p className="mt-8 text-sm leading-8 text-muted-foreground">{collection.story}</p>
        </div>

        <div className="mx-auto mt-20 grid max-w-5xl gap-14 md:grid-cols-2">
          <DetailList title="Details" items={collection.details} />
          <DetailList title="The collection" items={collection.collection} />
        </div>

        <div className="mx-auto mt-24 max-w-5xl">
          <p className="border-b border-brand-forest/15 pb-5 text-[10px] font-bold uppercase tracking-[0.45em] text-brand-gold">
            Select an edition
          </p>
          {collection.packages.map((fallback) => {
            const product = products.find((item) => item.package === fallback.name);
            const price = product?.price ?? fallback.price;
            const includes = product?.specifications?.length ? product.specifications : fallback.includes;
            const stock = product?.stock ?? 0;
            const label = `${formatRM(price)}${fallback.name === "Bespoke" ? "+" : ""}`;

            return (
              <section
                key={fallback.name}
                className="group grid gap-6 border-b border-brand-forest/10 py-9 transition-colors hover:bg-brand-mist/60 md:grid-cols-[1fr_auto] md:items-center md:gap-10"
              >
                <div className="md:pr-10">
                  <div className="flex flex-wrap items-baseline gap-4">
                    <h3 className="font-display text-3xl font-normal">{fallback.name}</h3>
                    {fallback.badge ? (
                      <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-brand-gold">{fallback.badge}</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{includes.join(" · ")}</p>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                    {stock > 0 ? `${stock} available` : "Currently unavailable"}
                  </p>
                </div>

                <div className="flex items-center gap-8 md:justify-end">
                  <p className="font-display text-3xl font-normal">{label}</p>
                  {signedIn ? (
                    <Button variant="maqamy" className="min-w-40" disabled={stock < 1} onClick={() => void onAdd(collection.name, fallback.name)}>
                      {stock > 0 ? "Add to cart" : "Out of stock"}
                    </Button>
                  ) : (
                    <Button asChild variant="maqamy" className="min-w-40" disabled={stock < 1}>
                      <Link to="/auth" search={{ redirect: "/collections" }}>{stock > 0 ? "Sign in to add" : "Out of stock"}</Link>
                    </Button>
                  )}
                </div>
              </section>
            );
          })}

          <div className="mt-10 flex justify-center">
            <Button asChild variant="link" className="text-brand-forest">
              <Link to="/cart">View cart <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function AdditionalProducts({ products, signedIn, onAdd }: {
  products: CatalogueProduct[];
  signedIn: boolean;
  onAdd: ReturnType<typeof useCart>["addToCart"];
}) {
  return (
    <section className="border-t border-brand-forest/10 px-5 py-20 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-16 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-brand-gold">New additions</p>
          <h2 className="mt-6 font-display text-5xl font-normal italic sm:text-6xl">More from MAQAMY</h2>
        </div>

        <div className="grid gap-x-10 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="group flex flex-col">
              <div className="mb-8 flex aspect-[4/5] items-center justify-center overflow-hidden bg-brand-mist">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="font-display text-5xl italic text-brand-forest/20">{product.collection}</span>
                )}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-brand-gold">{product.collection} — {product.package}</p>
              <h3 className="mt-4 font-display text-3xl font-normal">{product.name}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{product.description}</p>
              <p className="mt-6 font-display text-2xl">{formatRM(product.price)}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {product.stock > 0 ? `${product.stock} available` : "Currently unavailable"}
              </p>
              <div className="mt-6">
                {signedIn ? (
                  <Button variant="maqamy" className="w-full" disabled={product.stock < 1} onClick={() => void onAdd(product.collection, product.package)}>
                    {product.stock > 0 ? "Add to cart" : "Out of stock"}
                  </Button>
                ) : (
                  <Button asChild variant="maqamy" className="w-full" disabled={product.stock < 1}>
                    <Link to="/auth" search={{ redirect: "/collections" }}>{product.stock > 0 ? "Sign in to add" : "Out of stock"}</Link>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="border-b border-brand-forest/15 pb-4 text-[10px] font-bold uppercase tracking-[0.45em] text-brand-gold">{title}</p>
      <ul className="mt-6 space-y-5 text-sm leading-7 text-muted-foreground">
        {items.map((item) => <li key={item} className="border-b border-brand-forest/5 pb-5 last:border-0">{item}</li>)}
      </ul>
    </div>
  );
}
