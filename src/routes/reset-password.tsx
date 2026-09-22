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

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setHasRecovery(params.get("type") === "recovery" || params.has("access_token"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = passwordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your new password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    await navigate({ to: "/auth", search: { redirect: "/" } });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-5 py-10 text-brand-forest">
      <div className="w-full max-w-md border border-brand-gold/30 bg-card p-6 shadow-maqamy">
        <img src={brandAssets.logo} alt="MAQAMY Living Concepts" className="mx-auto mb-6 w-24" />
        <h1 className="font-display text-4xl font-semibold">Reset password</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {hasRecovery
            ? "Enter a new password for your customer account."
            : "Open this page from the password reset email to set a new password."}
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Label className="block text-sm font-semibold">
            <span className="mb-2 block">New password</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          </Label>
          <Label className="block text-sm font-semibold">
            <span className="mb-2 block">Confirm password</span>
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
          </Label>
          <Button type="submit" variant="gold" className="w-full" disabled={loading || !hasRecovery}>
            {loading ? <Loader2 className="animate-spin" /> : null}
            Update password
          </Button>
        </form>
        <Button asChild variant="link" className="mt-4 px-0 text-brand-forest">
          <Link to="/auth" search={{ redirect: "/" }}>
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
      </div>
    </main>
  );
}
