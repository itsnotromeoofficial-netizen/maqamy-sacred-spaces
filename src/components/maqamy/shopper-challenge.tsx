import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { clickVerificationPassed } from "@/lib/click-verification";

export function ShopperChallenge({ purpose, email, onVerified }: { purpose: "signup" | "checkout"; email?: string; onVerified: (proof: string | null) => void }) {
  const { t } = useLang();
  const [verified, setVerified] = useState(false);
  const callback = useRef(onVerified); callback.current = onVerified;
  useEffect(() => { setVerified(false); callback.current(null); }, [email, purpose]);
  return <div className="space-y-3 border-y border-border py-4 text-foreground">
    <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" />{t("Shopper verification", "Pengesahan pembeli")}</div>
    {verified ? <p role="status" className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" />{t("Verified", "Disahkan")}</p> :
      <Button type="button" variant="cream" onClick={() => { if (clickVerificationPassed(true)) { setVerified(true); callback.current("clicked"); } }}><ShieldCheck />{t("I'm not a robot", "Saya bukan robot")}</Button>}
  </div>;
}