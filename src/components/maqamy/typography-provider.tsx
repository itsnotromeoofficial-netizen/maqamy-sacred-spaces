import { useQuery } from "@tanstack/react-query";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { typographySchema, typographyVariables } from "@/lib/typography";

export const typographyQuery = {
  queryKey: ["website-typography"],
  queryFn: async () => {
    const { data, error } = await supabase.from("typography_settings").select("settings").eq("id", "website").maybeSingle();
    if (error) throw new Error("Text sizes could not be loaded.");
    const parsed = typographySchema.safeParse(data?.settings ?? {});
    return parsed.success ? parsed.data : {};
  },
  staleTime: 30_000,
  refetchInterval: 60_000,
};

export function TypographyProvider({ children }: { children: ReactNode }) {
  const { data = {} } = useQuery(typographyQuery);
  return <div className="website-typography" style={typographyVariables(data) as CSSProperties}>{children}</div>;
}