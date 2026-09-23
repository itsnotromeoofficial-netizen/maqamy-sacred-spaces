import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Chrome, Loader2 } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { brandAssets } from "@/lib/maqamy-products";
import { siteUrl } from "@/lib/site";

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100, "Name is too long"),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30, "Phone number is too long"),
  email: z.string().trim().email("Enter a valid email").max(255, "Email is too long"),
  address: z.string().trim().min(8, "Enter your delivery address").max(500, "Address is too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255, "Email is too long"),
  password: z.string().min(1, "Enter your password").max(128, "Password is too long"),
});

const resetSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255, "Email is too long"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => ({
    redirect:
      typeof search["redirect"] === "string" && search["redirect"].startsWith("/")
        ? search["redirect"]
        : "/",
  }),
  head: () => ({
    meta: [
      { title: "Customer Account — MAQAMY Living Concepts" },
      {
        name: "description",
        content: "Sign in or register for a MAQAMY customer account to save delivery details and build your prayer-space cart.",
      },
      { property: "og:title", content: "Customer Account — MAQAMY Living Concepts" },
      {
        property: "og:description",
        content: "Create a MAQAMY customer account with name, phone, email, and address for a smooth premium checkout experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"sign-in" | "register">("register");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [verify, setVerify] = useState<{ email: string; kind: "signup" | "recovery" } | null>(null);
  const [code, setCode] = useState("");
  const [values, setValues] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    password: "",
  });

  const safeRedirect = useMemo(() => search.redirect || "/", [search.redirect]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: safeRedirect });
    });
  }, [navigate, safeRedirect]);

  function updateValue(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleGoogle() {
    setLoading(true);
    setNotice("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (result.error) {
      toast.error("Google sign-in could not start.");
      return;
    }
    if (result.redirected) return;
    await navigate({ to: safeRedirect });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    if (mode === "register") {
      const parsed = registerSchema.safeParse(values);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Check your registration details.");
        setLoading(false);
        return;
      }

      const { email, password, fullName, phone, address } = parsed.data;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: siteUrl("/"),
          data: { full_name: fullName, phone, address },
        },
      });

      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data.session) {
        setVerify({ email, kind: "signup" });
        setCode("");
        setNotice("We sent a 6-digit verification code to your email. Enter it below.");
        return;
      }
      await navigate({ to: safeRedirect });
      return;
    }

    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your sign-in details.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await navigate({ to: safeRedirect });
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verify) return;
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: verify.email,
      token,
      type: verify.kind === "signup" ? "signup" : "recovery",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (verify.kind === "recovery") {
      await navigate({ to: "/reset-password" });
      return;
    }
    await navigate({ to: safeRedirect });
  }

  async function handleResend() {
    if (!verify) return;
    setLoading(true);
    const { error } =
      verify.kind === "signup"
        ? await supabase.auth.resend({ type: "signup", email: verify.email })
        : await supabase.auth.resetPasswordForEmail(verify.email);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotice("A new code is on its way.");
  }

  async function handleReset() {
    const parsed = resetSchema.safeParse({ email: values.email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter your email first.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: siteUrl("/reset-password"),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setVerify({ email: parsed.data.email, kind: "recovery" });
    setCode("");
    setNotice("We sent a 6-digit code to your email. Enter it below to continue.");
  }


  return (
    <main className="min-h-screen bg-brand-cream text-brand-forest">
      <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-brand-forest lg:block">
          <img
            src={brandAssets.prayerSpace}
            alt="MAQAMY prayer space interior"
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-brand-forest/35" />
          <div className="absolute left-10 top-10 w-28">
            <img src={brandAssets.logo} alt="MAQAMY Living Concepts" className="w-full" />
          </div>
          <div className="absolute bottom-10 left-10 max-w-md text-brand-cream">
            <p className="font-display text-5xl font-semibold italic leading-tight">A place to return.</p>
            <p className="mt-4 text-sm leading-7 text-brand-cream/80">
              Sign in to preserve your selected prayer-space collection, delivery details, and consultation cart.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-xl">
            <Button asChild variant="cream" size="sm" className="mb-8">
              <Link to="/">
                <ArrowLeft />
                Return to store
              </Link>
            </Button>

            <div className="border border-brand-gold/30 bg-card p-5 shadow-maqamy sm:p-8">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-brand-gold">Customer account</p>
                  <h1 className="mt-2 font-display text-4xl font-semibold text-brand-forest sm:text-5xl">
                    {verify ? "Verify" : mode === "register" ? "Register" : "Sign in"}
                  </h1>
                </div>
                <img src={brandAssets.logo} alt="MAQAMY" className="w-20" />
              </div>

              {verify ? (
                <>
                  {notice ? <p className="mb-5 border border-brand-gold/30 bg-brand-mist p-3 text-sm text-brand-forest">{notice}</p> : null}
                  <p className="mb-5 text-sm leading-6 text-muted-foreground">
                    Sent to <span className="font-semibold text-brand-forest">{verify.email}</span>
                  </p>
                  <form className="space-y-4" onSubmit={handleVerify}>
                    <Field label="6-digit code">
                      <Input
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        className="text-center font-display text-3xl tracking-[0.4em]"
                        required
                      />
                    </Field>
                    <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" /> : null}
                      {verify.kind === "recovery" ? "Continue" : "Verify account"}
                    </Button>
                  </form>
                  <div className="mt-4 flex items-center justify-between">
                    <Button type="button" variant="link" className="px-0 text-brand-forest" onClick={handleResend} disabled={loading}>
                      Resend code
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-brand-forest"
                      onClick={() => {
                        setVerify(null);
                        setNotice("");
                      }}
                      disabled={loading}
                    >
                      Use another email
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6 grid grid-cols-2 gap-2 rounded-md bg-secondary p-1">
                    <Button type="button" variant={mode === "register" ? "maqamy" : "ghost"} onClick={() => setMode("register")}>Register</Button>
                    <Button type="button" variant={mode === "sign-in" ? "maqamy" : "ghost"} onClick={() => setMode("sign-in")}>Sign in</Button>
                  </div>

                  {notice ? <p className="mb-5 border border-brand-gold/30 bg-brand-mist p-3 text-sm text-brand-forest">{notice}</p> : null}

                  <form className="space-y-4" onSubmit={handleSubmit}>
                    {mode === "register" ? (
                      <>
                        <Field label="Full name">
                          <Input value={values.fullName} onChange={(event) => updateValue("fullName", event.target.value)} autoComplete="name" required />
                        </Field>
                        <Field label="Phone number">
                          <Input value={values.phone} onChange={(event) => updateValue("phone", event.target.value)} autoComplete="tel" required />
                        </Field>
                      </>
                    ) : null}

                    <Field label="Email">
                      <Input type="email" value={values.email} onChange={(event) => updateValue("email", event.target.value)} autoComplete="email" required />
                    </Field>

                    {mode === "register" ? (
                      <Field label="Delivery address">
                        <Textarea value={values.address} onChange={(event) => updateValue("address", event.target.value)} autoComplete="street-address" required />
                      </Field>
                    ) : null}

                    <Field label="Password">
                      <Input type="password" value={values.password} onChange={(event) => updateValue("password", event.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} required />
                    </Field>

                    <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" /> : null}
                      {mode === "register" ? "Create account" : "Sign in"}
                    </Button>
                  </form>

                  <div className="my-6 flex items-center gap-3 text-xs uppercase text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    <span>or</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <Button type="button" variant="cream" size="lg" className="w-full" onClick={handleGoogle} disabled={loading}>
                    <Chrome />
                    Continue with Google
                  </Button>

                  {mode === "sign-in" ? (
                    <Button type="button" variant="link" className="mt-3 px-0 text-brand-forest" onClick={handleReset} disabled={loading}>
                      Forgot password — send me a code
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="block text-sm font-semibold text-brand-forest">
      <span className="mb-2 block">{label}</span>
      {children}
    </Label>
  );
}
