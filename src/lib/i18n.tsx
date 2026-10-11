import { useEffect, useState, useSyncExternalStore } from "react";

export type Lang = "en" | "ms";
const KEY = "maqamy-lang";

let current: Lang = "en";
let chosen = false;
const listeners = new Set<() => void>();

function emit() { listeners.forEach((fn) => fn()); }
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

export function initLang() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem(KEY);
  if (saved === "en" || saved === "ms") { current = saved; chosen = true; }
  document.documentElement.lang = current;
  emit();
}

export function setLang(lang: Lang) {
  current = lang;
  chosen = true;
  try { window.localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  emit();
}

/** Translate outside React (toasts, validation). */
export function tr(en: string, ms: string) { return current === "ms" ? ms : en; }

export function useLang() {
  const lang = useSyncExternalStore(subscribe, () => current, () => "en" as Lang);
  const t = (en: string, ms: string) => (lang === "ms" ? ms : en);
  return { lang, t, setLang };
}

export function useLangChosen() {
  const [ready, setReady] = useState(false);
  const isChosen = useSyncExternalStore(subscribe, () => chosen, () => true);
  useEffect(() => { initLang(); setReady(true); }, []);
  return ready ? isChosen : true;
}

/** Malay copy for the fixed collections. */
export const msCollections: Record<string, { subtitle: string; quote: string; story: string; details: string[]; collection: string[] }> = {
  Noor: {
    subtitle: "Cahaya Setiap Hari",
    quote: "Jadikan rumah anda tempat yang bercahaya.",
    story: "Koleksi yang tenang, diilhamkan oleh cahaya Ilahi. Garisan yang bersih, geometri yang halus dan rona yang hangat mencipta ruang solat yang membawa kejelasan, ketenangan dan kehadiran ke dalam rumah anda.",
    details: [
      "Corak Islamik CNC dengan geometri rumit yang dihasilkan secara tepat.",
      "Lampu LED putih hangat 3000K yang boleh dimalapkan.",
      "Kaligrafi 3D akrilik atau kemasan logam.",
      "Kemasan MDF dan HPL premium dengan cat bertekstur.",
    ],
    collection: [
      "Mihrab: 4ka (L) x 8ka (T), reka bentuk tersuai, bahan premium, lampu LED pilihan.",
      "Sejadah: 120cm x 70cm, berketumpatan tinggi, lembut disentuh, reka bentuk sepadan.",
      "Meja sisi: Ø40cm x T50cm, kemasan logam berus dan kayu.",
      "Aksesori: rehal Al-Quran, tasbih dan set wangian.",
    ],
  },
  Janna: {
    subtitle: "Taman di Rumah",
    quote: "Tempat yang damai, sekilas gambaran Jannah.",
    story: "Diilhamkan oleh taman-taman Jannah, koleksi ini menggabungkan keindahan alam dan seni Islam. Rona bumi, corak yang anggun dan tekstur semula jadi mencipta ruang yang tenang untuk kembali kepada Allah.",
    details: [
      "Motif bunga dan arabes semula jadi yang diilhamkan oleh taman Islam.",
      "Profil 3D berlapis dengan lampu latar LED yang hangat.",
      "Kaligrafi 3D kemasan logam dalam emas matte.",
      "Bahan semula jadi: kayu, cat bertekstur dan kemasan batu.",
      "Kemasan halus di mana setiap butiran menjadi peringatan tentang syurga.",
    ],
    collection: [
      "Mihrab: 4ka (L) x 8ka (T), reka bentuk tersuai, bahan premium, lampu LED pilihan.",
      "Sejadah: 120cm x 70cm, tenunan premium, lembut disentuh, reka bentuk sepadan.",
      "Meja sisi: Ø40cm x T50cm, kemasan kayu padu dan venir.",
      "Aksesori: rehal Al-Quran, tasbih dan set wangian.",
    ],
  },
};

const msWords: Record<string, string> = {
  "Prayer Rug": "Sejadah", "Side Table": "Meja Sisi", "Quran Stand": "Rehal Al-Quran", Packaging: "Pembungkusan",
  "Custom design": "Reka bentuk tersuai", "Wall panels": "Panel dinding", "Full installation": "Pemasangan penuh",
  "Most popular": "Paling popular", Essential: "Asas", Signature: "Tandatangan", Bespoke: "Tempahan Khas",
};
export function trWord(word: string, lang: Lang) { return lang === "ms" ? (msWords[word] ?? word) : word; }

export const ORDER_LABELS_MS: Record<string, string> = {
  pending: "Menunggu kelulusan", approved: "Diluluskan", preparing: "Sedang disediakan",
  shipped: "Dalam perjalanan", delivered: "Telah dihantar", rejected: "Ditolak",
};
