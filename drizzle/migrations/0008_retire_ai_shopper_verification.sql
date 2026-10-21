CREATE OR REPLACE FUNCTION public.guard_shopper_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.guard_shopper_signup() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.guarded_place_order(_proof uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF; RETURN public.place_order(); END; $$;
REVOKE ALL ON FUNCTION public.guarded_place_order(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.guarded_place_order(uuid) TO authenticated,service_role;
REVOKE EXECUTE ON FUNCTION public.place_order() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.place_order() TO authenticated,service_role;
COMMENT ON TABLE public.shopper_challenges IS 'DEPRECATED: shopper verification now uses a local click check, not AI challenges.';
COMMENT ON TABLE public.shopper_ai_state IS 'DEPRECATED: AI shopper assessment is disabled.';