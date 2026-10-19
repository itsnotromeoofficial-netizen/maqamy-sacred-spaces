import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { useCart } from "@/lib/use-cart";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MAQAMY Living Concepts" },
      {
        name: "description",
        content: "Privacy policy for MAQAMY Living Concepts customer accounts, delivery details, and shopping cart information.",
      },
      { property: "og:title", content: "Privacy Policy — MAQAMY Living Concepts" },
      {
        property: "og:description",
        content: "How MAQAMY Living Concepts protects customer account, contact, address, and order information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { itemCount, userEmail, signOut } = useCart();
  const { t, lang } = useLang();
  return (
    <main className="min-h-screen bg-brand-cream text-brand-forest">
      <SiteHeader tone="dark" itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} />
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-12">
        <section className="py-12 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">{t("Privacy policy", "Dasar privasi")}</p>
          <h1 className="mt-4 font-display text-3xl font-light leading-tight sm:text-4xl">
            MAQAMY Living Concepts
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            {t("MAQAMY Living Concepts respects the privacy of every customer. This policy explains how customer information is collected, used, and protected when creating an account, adding products to cart, or requesting a purchase consultation.", "MAQAMY Living Concepts menghormati privasi setiap pelanggan. Dasar ini menerangkan cara maklumat pelanggan dikumpul, digunakan dan dilindungi semasa mencipta akaun, menambah produk ke troli, atau meminta perundingan pembelian.")}
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {(lang === "ms" ? [
            ["Maklumat yang kami kumpul", "Nama, nombor telefon, alamat e-mel, alamat penghantaran, butiran log masuk akaun, pilihan troli, koleksi pilihan, pilihan pakej, dan mesej yang dikongsi untuk perundingan atau pengendalian pesanan."],
            ["Cara kami menggunakannya", "Maklumat pelanggan digunakan untuk mengurus akaun, menyimpan item troli, menyediakan perbincangan pembelian, menyokong perancangan penghantaran, menjawab pertanyaan, dan menambah baik pengalaman pelanggan MAQAMY."],
            ["Cara ia dilindungi", "Profil pelanggan dan rekod troli disimpan dalam pangkalan data berasaskan akaun yang selamat. Setiap akaun pelanggan hanya boleh mengakses profil dan maklumat troli miliknya sahaja."],
            ["Perkongsian", "MAQAMY tidak menjual maklumat pelanggan. Butiran hanya boleh dikongsi apabila perlu untuk memenuhi permintaan pelanggan, mengatur penghantaran, menyediakan sokongan pemasangan, atau mematuhi kewajipan undang-undang."],
            ["Kawalan pelanggan", "Pelanggan boleh meminta pembetulan atau pemadaman maklumat akaun dan penghantaran, tertakluk kepada maklumat yang perlu disimpan oleh MAQAMY atas sebab perniagaan atau undang-undang yang sah."],
            ["Hak cipta", "MAQAMY Living Concepts serta persembahan, bahasa produk, identiti koleksi dan bahan jenama MAQAMY adalah hak cipta © 2026."],
          ] : [
            ["Information we collect", "Name, phone number, email address, delivery address, account login details, cart selections, preferred collection, package selection, and messages shared for consultation or order handling."],
            ["How we use it", "Customer information is used to manage accounts, save cart items, prepare purchase conversations, support delivery planning, answer enquiries, and improve the MAQAMY customer experience."],
            ["How it is protected", "Customer profiles and cart records are stored in a secure account-based database. Each customer account can access only its own saved profile and cart information."],
            ["Sharing", "MAQAMY does not sell customer information. Details may be shared only when needed to fulfil a customer request, arrange delivery, provide installation support, or comply with legal obligations."],
            ["Customer control", "Customers may request correction or removal of account and delivery information, subject to any information MAQAMY must retain for legitimate business or legal reasons."],
            ["Copyright", "MAQAMY Living Concepts and the MAQAMY presentation, product language, collection identity, and brand materials are copyrighted © 2026."],
          ]).map(([title, body]) => (
            <article key={title} className="border border-brand-gold/25 bg-card p-5 shadow-gold">
              <h2 className="font-display text-3xl font-light">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
