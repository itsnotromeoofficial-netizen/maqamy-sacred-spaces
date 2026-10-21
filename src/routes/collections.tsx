import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { BannerCarousel, useBanners } from "@/components/maqamy/banner-carousel";
import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { Button } from "@/components/ui/button";
import { collections, formatRM, type ProductCollection } from "@/lib/maqamy-products";
import { useCart } from "@/lib/use-cart";
import { useProducts, type CatalogueProduct } from "@/lib/use-products";
import { msCollections, trWord, useLang } from "@/lib/i18n";

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

type GridItem = {
  key: string;
  collection: string;
  packageName: string;
  name: string;
  price: number;
  image: string | null;
  imageAlt: string;
  stock: number;
  collectionData?: ProductCollection;
  product?: CatalogueProduct | undefined;
};

function CollectionsPage() {
  const { itemCount, userEmail, addToCart, signOut } = useCart();
  const { products } = useProducts();
  const { t } = useLang();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const banners = useBanners();

  const items: GridItem[] = collections.flatMap((collection) =>
    collection.packages.map((pkg) => {
      const product = products.find((item) => item.collection === collection.name && item.package === pkg.name);
      return {
        key: `${collection.name}-${pkg.name}`,
        collection: collection.name,
        packageName: pkg.name,
        name: `${collection.name} ${pkg.name}`,
        price: product?.price ?? pkg.price,
        image: collection.image,
        imageAlt: collection.imageAlt,
        stock: product?.stock ?? 0,
        collectionData: collection,
        product,
      };
    }),
  );
  const extras = products
    .filter((product) => !collections.some((collection) => collection.name === product.collection))
    .map((product) => ({
      key: `extra-${product.id}`,
      collection: product.collection,
      packageName: product.package,
      name: product.name,
      price: product.price,
      image: product.image_url,
      imageAlt: product.name,
      stock: product.stock,
      product,
    }));

  const all = [...items, ...extras];
  const selected = all.find((item) => item.key === selectedKey) ?? null;

  return (
    <main className="bg-brand-cream text-brand-forest">
      <SiteHeader itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} tone="dark" />

      {selected ? (
        <ProductDetail key={selected.key} item={selected} signedIn={Boolean(userEmail)} onAdd={addToCart} onBack={() => setSelectedKey(null)} />
      ) : (
        <>
          <BannerCarousel banners={banners} tone="dark" />
          <section className="px-5 pb-10 pt-10 sm:px-8 lg:px-12 lg:pb-14 lg:pt-14">
            <div className="mx-auto max-w-3xl text-center">
              <p className="type-label text-[10px] font-semibold uppercase tracking-[0.5em] text-brand-gold">Sakinah</p>
              <h1 className="type-heading mt-4 font-display text-3xl font-light italic leading-[1.1] sm:text-4xl">{t("Two expressions of peace", "Dua ekspresi ketenangan")}</h1>
              <p className="type-body mx-auto mt-4 max-w-md text-xs leading-6 text-muted-foreground">
                {t("Complete prayer environments, considered from the mihrab to the final object.", "Persekitaran solat yang lengkap, dirancang dari mihrab hingga objek terakhir.")}
              </p>
            </div>
          </section>

          <section className="px-5 pb-16 sm:px-8 lg:px-12 lg:pb-24">
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {all.map((item) => (
                <ProductCard key={item.key} item={item} onOpen={() => setSelectedKey(item.key)} />
              ))}
            </div>
          </section>
        </>
      )}

      <SiteFooter />
    </main>
  );
}

function ProductCard({ item, onOpen }: { item: GridItem; onOpen: () => void }) {
  const { t, lang } = useLang();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col border border-brand-forest/10 bg-card text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand-forest/30 hover:shadow-maqamy"
    >
      <div className="maqamy-product-image flex aspect-square items-center justify-center overflow-hidden bg-brand-mist p-4 sm:p-6">
        {item.image ? (
          <img src={item.image} alt={item.imageAlt} className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <span className="type-body font-display text-3xl italic text-brand-forest/20">{item.collection}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-5">
        <p className="type-label text-[9px] font-semibold uppercase tracking-[0.3em] text-brand-gold">{item.collection}</p>
        <h3 className="type-productCard font-display text-base font-light leading-snug sm:text-xl">{trWord(item.packageName, lang)}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="font-display text-sm sm:text-lg type-price">{formatRM(item.price)}{item.packageName === "Bespoke" ? "+" : ""}</p>
          <span className={`text-[9px] font-semibold uppercase tracking-[0.2em] ${item.stock > 0 ? "text-muted-foreground" : "text-destructive"}`}>
            {item.stock > 0 ? t(`${item.stock} left`, `${item.stock} lagi`) : t("Sold out", "Habis")}
          </span>
        </div>
      </div>
    </button>
  );
}

function ProductDetail({ item, signedIn, onAdd, onBack }: {
  item: GridItem;
  signedIn: boolean;
  onAdd: ReturnType<typeof useCart>["addToCart"];
  onBack: () => void;
}) {
  const { t, lang } = useLang();
  const collection = item.collectionData;
  const ms = collection ? (lang === "ms" ? msCollections[collection.name] : undefined) : undefined;
  const includes = item.product?.specifications?.length
    ? item.product.specifications
    : collection?.packages.find((pkg) => pkg.name === item.packageName)?.includes ?? [];

  return (
    <section className="animate-page-in px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-6 -ml-2 text-brand-forest">
          <ArrowLeft /> {t("Back to collections", "Kembali ke koleksi")}
        </Button>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          <figure className="maqamy-product-image min-w-0 self-start bg-brand-mist p-4 sm:p-8">
            {item.image ? (
              <img src={item.image} alt={item.imageAlt} className="mx-auto block h-auto w-full object-contain" />
            ) : (
              <span className="type-body grid aspect-square place-items-center font-display text-4xl italic text-brand-forest/20">{item.collection}</span>
            )}
          </figure>

          <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <p className="type-label text-[10px] font-semibold uppercase tracking-[0.45em] text-brand-gold">
              {collection ? (ms?.subtitle ?? collection.subtitle) : item.collection}
            </p>
            <h1 className="type-productDetail mt-3 font-display text-3xl font-light uppercase leading-tight sm:text-4xl">{item.name}</h1>
            {collection ? <p className="type-body mt-4 font-display text-lg font-light italic leading-snug sm:text-xl">“{ms?.quote ?? collection.quote}”</p> : null}
            <p className="type-body mt-4 text-xs leading-6 text-muted-foreground">
              {collection ? (ms?.story ?? collection.story) : item.product?.description}
            </p>

            {item.product?.features?.length ? (
              <ul className="type-body mt-4 space-y-1 text-xs leading-6 text-muted-foreground">
                {item.product.features.map((feature) => <li key={feature}>— {feature}</li>)}
              </ul>
            ) : null}
            {item.product?.colours?.length ? (
              <p className="type-body mt-3 text-xs text-muted-foreground"><span className="type-label font-semibold uppercase tracking-[0.2em] text-brand-forest">{t("Colours", "Warna")}</span> · {item.product.colours.join(", ")}</p>
            ) : null}
            {item.product?.varieties?.length ? (
              <p className="type-body mt-2 text-xs text-muted-foreground"><span className="type-label font-semibold uppercase tracking-[0.2em] text-brand-forest">{t("Varieties", "Variasi")}</span> · {item.product.varieties.join(", ")}</p>
            ) : null}

            <div className="mt-8 border-t border-brand-forest/15 pt-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4">
                <p className="type-label text-[10px] font-semibold uppercase tracking-[0.45em] text-brand-gold">{t("Edition", "Edisi")}</p>
                <p className="font-display text-2xl font-light type-price">{formatRM(item.price)}{item.packageName === "Bespoke" ? "+" : ""}</p>
              </div>
              {includes.length ? (
                <ul className="type-body mt-4 space-y-2 text-xs leading-6 text-muted-foreground">
                  {includes.map((include) => <li key={include} className="border-b border-brand-forest/5 pb-2 last:border-0">{trWord(include, lang)}</li>)}
                </ul>
              ) : null}
              <p className={`mt-4 text-[10px] font-semibold uppercase tracking-[0.3em] ${item.stock > 0 ? "text-muted-foreground" : "text-destructive"}`}>
                {item.stock > 0 ? t(`${item.stock} available`, `${item.stock} tersedia`) : t("Currently unavailable", "Tiada stok buat masa ini")}
              </p>

              <div className="mt-6 grid gap-2">
                {signedIn ? (
                  <Button variant="maqamy" size="lg" className="w-full" disabled={item.stock < 1} onClick={() => void onAdd(item.collection, item.packageName)}>
                    <ShoppingBag /> {item.stock > 0 ? t("Add to cart", "Tambah ke troli") : t("Out of stock", "Kehabisan stok")}
                  </Button>
                ) : (
                  <Button asChild variant="maqamy" size="lg" className="w-full">
                    <Link to="/auth" search={{ redirect: "/collections" }}>{t("Sign in to add", "Log masuk untuk menambah")}</Link>
                  </Button>
                )}
                <Button asChild variant="link" className="w-full text-brand-forest">
                  <Link to="/cart">{t("View cart", "Lihat troli")} <ArrowRight /></Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {collection ? (
          <div className="mx-auto mt-14 grid max-w-4xl gap-10 md:grid-cols-2">
            <DetailList title={t("Details", "Butiran")} items={ms?.details ?? collection.details} />
            <DetailList title={t("The collection", "Koleksi")} items={ms?.collection ?? collection.collection} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="type-label border-b border-brand-forest/15 pb-3 text-[10px] font-semibold uppercase tracking-[0.45em] text-brand-gold">{title}</p>
      <ul className="type-body mt-4 space-y-3 text-xs leading-6 text-muted-foreground">
        {items.map((item) => <li key={item} className="border-b border-brand-forest/5 pb-3 last:border-0">{item}</li>)}
      </ul>
    </div>
  );
}
