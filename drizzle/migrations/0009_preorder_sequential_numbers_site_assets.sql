ALTER TABLE public.products ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available';
ALTER TABLE public.products ADD CONSTRAINT products_availability_check CHECK (availability IN ('available','preorder','out_of_stock'));
UPDATE public.products SET availability = 'out_of_stock' WHERE stock = 0;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false;

CREATE TABLE public.order_counters (day date PRIMARY KEY, last_value integer NOT NULL DEFAULT 0);
GRANT ALL ON public.order_counters TO service_role;
ALTER TABLE public.order_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_order_number() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _day date := (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date; _n integer;
BEGIN
  INSERT INTO public.order_counters (day, last_value) VALUES (_day, 1)
  ON CONFLICT (day) DO UPDATE SET last_value = public.order_counters.last_value + 1
  RETURNING last_value INTO _n;
  RETURN to_char(_day, 'YYYYMMDD') || CASE WHEN _n < 1000 THEN lpad(_n::text, 3, '0') ELSE _n::text END;
END; $$;
REVOKE ALL ON FUNCTION public.next_order_number() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT public.next_order_number();

CREATE OR REPLACE FUNCTION public.place_order()
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _profile public.profiles;
  _items jsonb;
  _total integer;
  _number text;
  _pre boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing'; END IF;

  IF EXISTS (SELECT 1 FROM public.cart_items c JOIN public.products p ON p.collection = c.collection AND p.package = c.package
             WHERE c.user_id = _uid AND p.availability = 'out_of_stock') THEN
    RAISE EXCEPTION 'An item in your cart is out of stock';
  END IF;

  SELECT jsonb_agg(jsonb_build_object('collection', c.collection, 'package', c.package, 'name', p.name, 'quantity', c.quantity, 'unit_price', p.price, 'preorder', p.availability = 'preorder')),
         COALESCE(sum(p.price * c.quantity), 0),
         bool_or(p.availability = 'preorder')
    INTO _items, _total, _pre
  FROM public.cart_items c
  JOIN public.products p ON p.collection = c.collection AND p.package = c.package AND p.active
  WHERE c.user_id = _uid;

  IF _items IS NULL THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  INSERT INTO public.orders (user_id, customer_name, customer_email, customer_phone, customer_address, items, total, is_preorder)
  VALUES (_uid, _profile.full_name, _profile.email, _profile.phone, _profile.address, _items, _total, COALESCE(_pre, false))
  RETURNING order_number INTO _number;

  DELETE FROM public.cart_items WHERE user_id = _uid;
  RETURN _number;
END;
$function$;

CREATE TABLE public.site_assets (
  key text PRIMARY KEY,
  url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_assets TO anon, authenticated;
GRANT ALL ON public.site_assets TO service_role;
ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view site assets" ON public.site_assets FOR SELECT TO anon, authenticated USING (true);