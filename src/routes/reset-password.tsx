import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { brandAssets } from "@/lib/maqamy-products";
import { tr, useLang } from "@/lib/i18n";

const passwordSchema = () => z
  .object({
    password: z.string().min(8, tr("Password must be at least 8 characters", "Kata laluan mestilah sekurang-kurangnya 8 aksara")).max(128, tr("Password is too long", "Kata laluan terlalu panjang")),
    confirmPassword: z.string().min(8, tr("Confirm your password", "Sahkan kata laluan anda")),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: tr("Passwords do not match", "Kata laluan tidak sepadan"),
    path: ["confirmPassword"],
  });

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — MAQAMY Living Concepts" },
      { name: "description", content: "Set a new password for your MAQAMY customer account." },
      { property: "og:title", content: "Reset Password — MAQAMY Living Concepts" },
      { property: "og:description", content: "Securely reset your MAQAMY customer account password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [hasRecovery, setHasRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setHasRecovery(params.get("type") === "recovery" || params.has("access_token"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = passwordSchema().safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("Check your new password.", "Semak kata laluan baharu anda."));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("Password updated.", "Kata laluan dikemas kini."));
    await navigate({ to: "/auth", search: { redirect: "/" } });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-5 py-10 text-brand-forest">
      <div className="w-full max-w-md border border-brand-gold/30 bg-card p-6 shadow-maqamy">
        <img src={brandAssets.logo} alt="MAQAMY Living Concepts" className="mx-auto mb-6 w-24" />
        <h1 className="font-display text-4xl font-light">{t("Reset password", "Tetapkan semula kata laluan")}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {hasRecovery
            ? t("Enter a new password for your customer account.", "Masukkan kata laluan baharu untuk akaun anda.")
            : t("Open this page from the password reset email to set a new password.", "Buka halaman ini daripada e-mel tetapan semula untuk menetapkan kata laluan baharu.")}
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Label className="block text-sm font-semibold">
            <span className="mb-2 block">{t("New password", "Kata laluan baharu")}</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          </Label>
          <Label className="block text-sm font-semibold">
            <span className="mb-2 block">{t("Confirm password", "Sahkan kata laluan")}</span>
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
          </Label>
          <Button type="submit" variant="gold" className="w-full" disabled={loading || !hasRecovery}>
            {loading ? <Loader2 className="animate-spin" /> : null}
            {t("Update password", "Kemas kini kata laluan")}
          </Button>
        </form>
        <Button asChild variant="link" className="mt-4 px-0 text-brand-forest">
          <Link to="/auth" search={{ redirect: "/" }}>
            <ArrowLeft />
            {t("Back to sign in", "Kembali ke log masuk")}
          </Link>
        </Button>
      </div>
    </main>
  );
}
