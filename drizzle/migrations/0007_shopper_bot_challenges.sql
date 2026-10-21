CREATE TABLE public.shopper_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purpose text NOT NULL CHECK (purpose IN ('signup','checkout')), binding text NOT NULL, answer integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes', assessed_at timestamptz, proof uuid UNIQUE, consumed_at timestamptz, risk text, signals jsonb
);
GRANT ALL ON public.shopper_challenges TO service_role;
REVOKE ALL ON public.shopper_challenges FROM anon, authenticated;
ALTER TABLE public.shopper_challenges ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.shopper_ai_state (id text PRIMARY KEY, blocked boolean NOT NULL DEFAULT false, message text);
GRANT ALL ON public.shopper_ai_state TO service_role;
REVOKE ALL ON public.shopper_ai_state FROM anon, authenticated;
ALTER TABLE public.shopper_ai_state ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.guard_shopper_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.raw_app_meta_data->>'provider' = 'email' THEN
  UPDATE public.shopper_challenges SET consumed_at=now() WHERE proof::text=NEW.raw_user_meta_data->>'shopper_proof' AND purpose='signup' AND binding=lower(NEW.email) AND expires_at>now() AND consumed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Please complete shopper verification before registering'; END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_shopper_signup() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_shopper_signup BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.guard_shopper_signup();
CREATE OR REPLACE FUNCTION public.guarded_place_order(_proof uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 UPDATE public.shopper_challenges SET consumed_at=now() WHERE proof=_proof AND purpose='checkout' AND binding=auth.uid()::text AND expires_at>now() AND consumed_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Please complete shopper verification before checkout'; END IF;
 result := public.place_order();
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.guarded_place_order(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.guarded_place_order(uuid) TO authenticated,service_role;
REVOKE EXECUTE ON FUNCTION public.place_order() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.place_order() TO service_role;