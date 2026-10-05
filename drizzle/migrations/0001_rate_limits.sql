CREATE TABLE public.rate_limit_events (
  id bigserial PRIMARY KEY,
  bucket text NOT NULL,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_limit_events_lookup ON public.rate_limit_events (bucket, key, created_at DESC);
GRANT ALL ON public.rate_limit_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limit_events_id_seq TO service_role;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Records a hit and returns true when the caller is still within the limit.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(_bucket text, _key text, _window_seconds int, _max int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '1 day';
  SELECT count(*) INTO n FROM public.rate_limit_events
    WHERE bucket = _bucket AND key = _key AND created_at > now() - make_interval(secs => _window_seconds);
  IF n >= _max THEN RETURN false; END IF;
  INSERT INTO public.rate_limit_events(bucket, key) VALUES (_bucket, _key);
  RETURN true;
END $$;

-- Counts hits without recording one.
CREATE OR REPLACE FUNCTION public.rate_limit_count(_bucket text, _key text, _window_seconds int)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.rate_limit_events
  WHERE bucket = _bucket AND key = _key AND created_at > now() - make_interval(secs => _window_seconds);
$$;

CREATE OR REPLACE FUNCTION public.rate_limit_clear(_bucket text, _key text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limit_events WHERE bucket = _bucket AND key = _key;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text,text,int,int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_count(text,text,int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_clear(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text,text,int,int) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_count(text,text,int) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_clear(text,text) TO service_role;

-- Customers can place at most 5 orders per 10 minutes.
CREATE OR REPLACE FUNCTION public.limit_order_rate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.rate_limit_hit('order', NEW.user_id::text, 600, 5) THEN
    RAISE EXCEPTION 'Too many orders in a short time. Please wait a few minutes.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.limit_order_rate() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER orders_rate_limit BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.limit_order_rate();