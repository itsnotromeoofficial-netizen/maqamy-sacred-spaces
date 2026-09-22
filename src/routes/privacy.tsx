import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/maqamy/site-chrome";
import { useCart } from "@/lib/use-cart";

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
  return (
    <main className="min-h-screen bg-brand-cream text-brand-forest">
      <SiteHeader tone="dark" itemCount={itemCount} userEmail={userEmail} onSignOut={signOut} />
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-12">
        <section className="py-12 lg:py-20">
          <p className="text-xs font-bold uppercase text-brand-gold">Privacy policy</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-none sm:text-7xl">
            MAQAMY Living Concepts
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            MAQAMY Living Concepts respects the privacy of every customer. This policy explains how customer information is collected, used, and protected when creating an account, adding products to cart, or requesting a purchase consultation.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {[
            ["Information we collect", "Name, phone number, email address, delivery address, account login details, cart selections, preferred collection, package selection, and messages shared for consultation or order handling."],
            ["How we use it", "Customer information is used to manage accounts, save cart items, prepare purchase conversations, support delivery planning, answer enquiries, and improve the MAQAMY customer experience."],
            ["How it is protected", "Customer profiles and cart records are stored in a secure account-based database. Each customer account can access only its own saved profile and cart information."],
            ["Sharing", "MAQAMY does not sell customer information. Details may be shared only when needed to fulfil a customer request, arrange delivery, provide installation support, or comply with legal obligations."],
            ["Customer control", "Customers may request correction or removal of account and delivery information, subject to any information MAQAMY must retain for legitimate business or legal reasons."],
            ["Copyright", "MAQAMY Living Concepts and the MAQAMY presentation, product language, collection identity, and brand materials are copyrighted © 2026."],
          ].map(([title, body]) => (
            <article key={title} className="border border-brand-gold/25 bg-card p-5 shadow-gold">
              <h2 className="font-display text-3xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
