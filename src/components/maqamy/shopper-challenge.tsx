import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/lib/i18n";
import { shopperVerificationRequest } from "@/lib/shopper-verification-client";

export function ShopperChallenge({ purpose, email, onVerified }: { purpose: "signup" | "checkout"; email?: string; onVerified: (proof: string | null) => void }) {
  const { t } = useLang();
  const [challenge, setChallenge] = useState<{ id: string; left: number; right: number } | null>(null);
  const [answer, setAnswer] = useState(""); const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false); const [verified, setVerified] = useState(false); const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const onVerifiedRef = useRef(onVerified); onVerifiedRef.current = onVerified;
  const events = useRef({ start: 0, pointerEvents: 0, keyEvents: 0, focusEvents: 0, pasteEvents: 0 });
  useEffect(() => {
    events.current = { start: performance.now(), pointerEvents: 0, keyEvents: 0, focusEvents: 0, pasteEvents: 0 };
    const pointer = () => { events.current.pointerEvents = Math.min(10000, events.current.pointerEvents + 1); };
    const key = () => { events.current.keyEvents = Math.min(10000, events.current.keyEvents + 1); };
    const focus = () => { events.current.focusEvents = Math.min(10000, events.current.focusEvents + 1); };
    const paste = () => { events.current.pasteEvents = Math.min(10000, events.current.pasteEvents + 1); };
    document.addEventListener("pointerdown", pointer); document.addEventListener("keydown", key); document.addEventListener("focusin", focus); document.addEventListener("paste", paste);
    return () => { document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", key); document.removeEventListener("focusin", focus); document.removeEventListener("paste", paste); controller.current?.abort(); };
  }, []);
  useEffect(() => { controller.current?.abort(); setChallenge(null); setVerified(false); setBusy(false); setError(""); onVerifiedRef.current(null); }, [email, purpose]);
  useEffect(() => { if (!verified) return; const timer = setTimeout(() => { setVerified(false); setChallenge(null); onVerifiedRef.current(null); }, 8 * 60 * 1000); return () => clearTimeout(timer); }, [verified]);
  async function start() {
    setBusy(true); setError(""); setAnswer(""); setVerified(false); onVerifiedRef.current(null);
    const abort = new AbortController(); controller.current = abort;
    try { setChallenge(await shopperVerificationRequest({ action: "start", purpose, ...(purpose === "signup" ? { email } : {}) }, abort.signal)); }
    catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : t("Verification unavailable.", "Pengesahan tidak tersedia.")); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  async function assess() {
    if (!challenge || !answer.trim()) return;
    setBusy(true); setError(""); const abort = new AbortController(); controller.current = abort;
    try {
      const { start: began, ...counts } = events.current;
      const result = await shopperVerificationRequest({ action: "assess", id: challenge.id, answer: Number(answer), website, signals: { ...counts, elapsedMs: Math.min(3600000, Math.round(performance.now() - began)), webdriver: navigator.webdriver === true } }, abort.signal);
      if (result.proof) { setVerified(true); onVerifiedRef.current(result.proof); }
      else { setChallenge(null); setError(t("Please complete a new challenge to continue.", "Sila lengkapkan cabaran baharu untuk meneruskan.")); }
    } catch (e) { if (!abort.signal.aborted) { setChallenge(null); setError(e instanceof Error ? e.message : t("Verification unavailable.", "Pengesahan tidak tersedia.")); } }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  return <div className="space-y-3 border-y border-border py-4 text-foreground">
    <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" />{t("Shopper verification", "Pengesahan pembeli")}</div>
    <p className="text-xs leading-5 text-muted-foreground">{t("AI checks interaction counts and timing, not your personal details. Keyboard, touch and autofill are welcome.", "AI menyemak bilangan interaksi dan masa, bukan butiran peribadi. Papan kekunci, sentuhan dan isian automatik diterima.")}</p>
    <div hidden aria-hidden="true"><input name="shopper-website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></div>
    {verified ? <p role="status" className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" />{t("Verified", "Disahkan")}</p> : challenge ? <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm" htmlFor={`challenge-${purpose}`}>{challenge.left} + {challenge.right} =</label>
      <Input id={`challenge-${purpose}`} aria-label={t("Challenge answer", "Jawapan cabaran")} type="number" inputMode="numeric" min={0} max={100} value={answer} onChange={e => setAnswer(e.target.value)} className="w-20 bg-background text-foreground" disabled={busy} />
      <Button type="button" variant="cream" disabled={busy || !answer.trim()} onClick={() => void assess()}>{busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}{t("Verify", "Sahkan")}</Button>
      <Button type="button" variant="ghost" size="icon" aria-label={t("New challenge", "Cabaran baharu")} disabled={busy} onClick={() => void start()}><RefreshCw /></Button>
    </div> : <Button type="button" variant="cream" disabled={busy} onClick={() => void start()}>{busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}{t("Start verification", "Mulakan pengesahan")}</Button>}
    {busy ? <Button type="button" variant="link" onClick={() => { controller.current?.abort(); setBusy(false); setChallenge(null); }}>{t("Cancel", "Batal")}</Button> : null}
    {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
  </div>;
}