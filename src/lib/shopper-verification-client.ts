import { supabase } from "@/integrations/supabase/client";
export async function shopperVerificationRequest(body: unknown, signal?: AbortSignal) {
  const { data } = await supabase.auth.getSession();
  const endpoint = ["localhost", "127.0.0.1"].includes(window.location.hostname) ? "/api/public/shopper-verify" : "https://maqamy-sacred-spaces.lovable.app/api/public/shopper-verify";
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", ...(data.session ? { authorization: `Bearer ${data.session.access_token}` } : {}) }, body: JSON.stringify(body), ...(signal ? { signal } : {}) });
  if (!response.ok) { const result = await response.json(); throw new Error(result.error ?? "Verification unavailable."); }
  if (!response.headers.get("content-type")?.includes("ndjson")) return response.json();
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Verification unavailable.");
  let buffer = ""; const decoder = new TextDecoder(); let final: { proof?: string; error?: string; retry?: boolean; message?: string; challenge?: { id: string; left: number; right: number } } | undefined;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) { const result = JSON.parse(line); if (result.proof || result.error || result.retry) final = result; }
  }
  if (!final) throw new Error("Verification did not finish. Try a new challenge.");
  if (final.error) throw new Error(final.error);
  return final;
}