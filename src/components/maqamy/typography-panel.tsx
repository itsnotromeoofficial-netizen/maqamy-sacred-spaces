import { useQueryClient } from "@tanstack/react-query";
import { Monitor, RotateCcw, Save, Smartphone } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { getAdminTypography, saveAdminTypography } from "@/lib/admin-api";
import { typographyRoles, typographyVariables, type TypographyDevice, type TypographyRole, type TypographySettings } from "@/lib/typography";

export function TypographyPanel() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<TypographySettings>({});
  const [saved, setSaved] = useState<TypographySettings>({});
  const [device, setDevice] = useState<TypographyDevice>("desktop");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = () => {
    setLoading(true); setError("");
    getAdminTypography().then((value) => { setSettings(value); setSaved(value); }).catch((e) => setError(e instanceof Error ? e.message : "Text sizes could not be loaded.")).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const update = (key: TypographyRole, value: number | null) => setSettings((current) => ({ ...current, [key]: { mobile: null, desktop: null, ...current[key], [device]: value } }));
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  const save = async () => {
    setSaving(true);
    try {
      const result = await saveAdminTypography(settings);
      setSaved(result); setSettings(result);
      queryClient.setQueryData(["website-typography"], result);
      toast.success("Website text sizes saved.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Text sizes could not be saved."); }
    finally { setSaving(false); }
  };
  if (loading) return <p className="text-sm text-muted-foreground">Loading text sizes…</p>;
  if (error) return <div role="alert"><p>{error}</p><Button variant="maqamy" className="mt-4" onClick={load}>Try again</Button></div>;
  return <section>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="font-display text-3xl font-light">Typography</h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" disabled={saving || !dirty} onClick={() => setSettings(saved)}>Discard changes</Button>
        <Button variant="ghost" disabled={saving} onClick={() => setSettings({})}><RotateCcw /> Reset all</Button>
        <Button variant="maqamy" disabled={saving || !dirty} onClick={() => void save()}><Save /> {saving ? "Saving…" : "Save text sizes"}</Button>
      </div>
    </div>
    <div className="mt-6 flex gap-2" aria-label="Screen size">
      <Button variant={device === "desktop" ? "maqamy" : "outline"} aria-pressed={device === "desktop"} disabled={saving} onClick={() => setDevice("desktop")}><Monitor /> Desktop</Button>
      <Button variant={device === "mobile" ? "maqamy" : "outline"} aria-pressed={device === "mobile"} disabled={saving} onClick={() => setDevice("mobile")}><Smartphone /> Mobile & tablet</Button>
    </div>
    <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="divide-y divide-border">
        {typographyRoles.map((role) => {
          const value = settings[role.key]?.[device] ?? role[device];
          const custom = settings[role.key]?.[device] != null;
          return <div key={role.key} className="py-4 first:pt-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label htmlFor={`size-${role.key}`} className="text-sm font-semibold">{role.label}</label>
              <div className="flex shrink-0 items-center gap-2">
                <Input id={`size-${role.key}`} aria-label={`${role.label} size`} type="number" min={8} max={96} step={1} value={value} disabled={saving} className="w-20 bg-card" onChange={(e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 8 && n <= 96) update(role.key, n); }} />
                <span className="text-xs text-muted-foreground">px</span>
                <Button variant="ghost" size="icon" title={`Reset ${role.label}`} aria-label={`Reset ${role.label}`} disabled={saving || !custom} onClick={() => update(role.key, null)}><RotateCcw className="size-4" /></Button>
              </div>
            </div>
            <Slider aria-label={`${role.label} slider`} min={8} max={96} step={1} value={[value]} disabled={saving} onValueChange={([n]) => { if (n !== undefined) update(role.key, n); }} />
          </div>;
        })}
      </div>
      <aside className="min-w-0 lg:sticky lg:top-6">
        <p className="mb-4 text-xs font-semibold uppercase text-muted-foreground">{device === "desktop" ? "Desktop" : "Mobile & tablet"} preview · {dirty ? "Unsaved" : "Saved"}</p>
        <div className={`typography-preview border border-border bg-card p-5 ${device === "mobile" ? "mx-auto max-w-[390px]" : "w-full"}`} style={typographyVariables(settings, device) as CSSProperties}>
          <p className="preview-navigation border-b border-border pb-4">Our story · Collections · Cart</p>
          <p className="preview-label mt-6 text-brand-gold">MAQAMY LIVING CONCEPTS</p>
          <h3 className="preview-homeHeading mt-3 font-light">A Space for the Heart to Be Present.</h3>
          <p className="preview-homeQuote mt-4 text-muted-foreground">Devotion cannot be designed, but its essence can be invited and nurtured through thoughtful spaces.</p>
          <h3 className="preview-heading mt-8 font-light">The MAQAMY Story</h3>
          <p className="preview-storyBody mt-3">Designed for the presence of the heart.</p>
          <p className="preview-productCard mt-8">Noor Essential</p>
          <h3 className="preview-productDetail mt-3 font-light">Noor Signature</h3>
          <p className="preview-price mt-3">RM 5,500</p>
          <p className="preview-body mt-3 text-muted-foreground">A complete prayer environment, considered from the mihrab to the final object.</p>
          <Button variant="maqamy" className="preview-control mt-5 h-auto min-h-10 whitespace-normal">Add to cart</Button>
          <p className="preview-banner mt-6 maqamy-banner-title">Noor collection</p>
          <h3 className="preview-accountHeading mt-6">Customer account</h3>
          <p className="preview-footer mt-6 border-t border-border pt-4">MAQAMY Living Concepts © 2026</p>
        </div>
      </aside>
    </div>
  </section>;
}