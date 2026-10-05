ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS colours text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS varieties text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  team text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_accounts TO service_role;
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('MQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX orders_user_idx ON public.orders(user_id, created_at DESC);
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.place_order()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _profile public.profiles;
  _items jsonb;
  _total integer;
  _number text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing'; END IF;

  SELECT jsonb_agg(jsonb_build_object('collection', c.collection, 'package', c.package, 'name', p.name, 'quantity', c.quantity, 'unit_price', p.price)),
         COALESCE(sum(p.price * c.quantity), 0)
    INTO _items, _total
  FROM public.cart_items c
  JOIN public.products p ON p.collection = c.collection AND p.package = c.package AND p.active
  WHERE c.user_id = _uid;

  IF _items IS NULL THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  INSERT INTO public.orders (user_id, customer_name, customer_email, customer_phone, customer_address, items, total)
  VALUES (_uid, _profile.full_name, _profile.email, _profile.phone, _profile.address, _items, _total)
  RETURNING order_number INTO _number;

  DELETE FROM public.cart_items WHERE user_id = _uid;
  RETURN _number;
END;
$$;
REVOKE ALL ON FUNCTION public.place_order() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order() TO authenticated;