import jannaCollection from "@/assets/janna-collection.jpg.asset.json";
import desertImage from "@/assets/maqamy-desert.jpg.asset.json";
import logoAsset from "@/assets/maqamy-wordmark.png.asset.json";
import prayerSpaceImage from "@/assets/maqamy-prayer-space.jpg.asset.json";
import noorCollection from "@/assets/noor-collection.jpg.asset.json";

export type CollectionName = "Noor" | "Janna";
export type PackageName = "Essential" | "Signature" | "Bespoke";

export type ProductPackage = {
  name: PackageName;
  price: number;
  priceLabel: string;
  badge?: string;
  includes: string[];
};

export type ProductCollection = {
  name: CollectionName;
  title: string;
  subtitle: string;
  quote: string;
  image: string;
  imageAlt: string;
  story: string;
  details: string[];
  collection: string[];
  packages: ProductPackage[];
};

export const brandAssets = {
  logo: logoAsset.url,
  desert: desertImage.url,
  prayerSpace: prayerSpaceImage.url,
};

export const collections: ProductCollection[] = [
  {
    name: "Noor",
    title: "Noor Collection",
    subtitle: "Light in Every Day",
    quote: "Let your home be a place of light.",
    image: noorCollection.url,
    imageAlt: "Noor prayer space collection with mihrab, rug, side table, and accessories",
    story:
      "A serene collection inspired by divine light. Clean lines, refined geometry, and warm tones create a prayer space that brings clarity, peace and presence to your home.",
    details: [
      "CNC Islamic pattern with precision-crafted intricate geometry.",
      "Warm white 3000K dimmable LED lighting.",
      "3D acrylic or metal-finish calligraphy.",
      "Premium MDF and HPL finish with textured paint.",
    ],
    collection: [
      "Mihrab: 4ft (W) x 8ft (H), custom design, premium materials, optional LED lighting.",
      "Prayer rug: 120cm x 70cm, high density, soft touch, matching design.",
      "Side table: Ø40cm x H50cm, brushed metal and wood finish.",
      "Accessories: Quran stand, tasbih, and fragrance set.",
    ],
    packages: [
      { name: "Essential", price: 2800, priceLabel: "RM 2,800", includes: ["Mihrab", "Prayer Rug"] },
      {
        name: "Signature",
        price: 5500,
        priceLabel: "RM 5,500",
        badge: "Most popular",
        includes: ["Mihrab", "Prayer Rug", "Side Table", "LED", "Quran Stand", "Packaging"],
      },
      {
        name: "Bespoke",
        price: 8500,
        priceLabel: "RM 8,500+",
        includes: ["Custom design", "Wall panels", "Full installation"],
      },
    ],
  },
  {
    name: "Janna",
    title: "Janna Collection",
    subtitle: "A Garden at Home",
    quote: "A place of peace, a glimpse of Jannah.",
    image: jannaCollection.url,
    imageAlt: "Janna prayer space collection with green mihrab, rug, side table, and accessories",
    story:
      "Inspired by the gardens of Jannah, this collection brings the beauty of nature and Islamic art together. Earthy tones, graceful patterns and natural textures create a tranquil space to reconnect with Allah.",
    details: [
      "Natural floral and arabesque motifs inspired by Islamic gardens.",
      "Layered 3D profile with warm LED backlighting.",
      "3D metal-finish calligraphy in matte gold.",
      "Wood, textured paint and stone-finish natural materials.",
      "A refined finish where every detail becomes a reminder of paradise.",
    ],
    collection: [
      "Mihrab: 4ft (W) x 8ft (H), custom design, premium materials, optional LED lighting.",
      "Prayer rug: 120cm x 70cm, premium weave, soft touch, matching design.",
      "Side table: Ø40cm x H50cm, solid wood and veneer finish.",
      "Accessories: Quran stand, tasbih, and fragrance set.",
    ],
    packages: [
      { name: "Essential", price: 3200, priceLabel: "RM 3,200", includes: ["Mihrab", "Prayer Rug"] },
      {
        name: "Signature",
        price: 5800,
        priceLabel: "RM 5,800",
        badge: "Most popular",
        includes: ["Mihrab", "Prayer Rug", "Side Table", "LED", "Quran Stand", "Packaging"],
      },
      {
        name: "Bespoke",
        price: 9500,
        priceLabel: "RM 9,500+",
        includes: ["Custom design", "Wall panels", "Full installation"],
      },
    ],
  },
];

export function findPackage(collection: CollectionName, packageName: PackageName) {
  return collections.find((item) => item.name === collection)?.packages.find((item) => item.name === packageName);
}

export function formatRM(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);
}
