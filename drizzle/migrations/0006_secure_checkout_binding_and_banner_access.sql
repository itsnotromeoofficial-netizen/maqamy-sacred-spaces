ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_session_id text, ADD COLUMN IF NOT EXISTS payment_environment text, ADD COLUMN IF NOT EXISTS payment_amount integer;
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_session_unique ON public.orders(payment_session_id) WHERE payment_session_id IS NOT NULL;
DROP POLICY IF EXISTS "Public can read banner files" ON storage.objects;
COMMENT ON COLUMN public.orders.payment_session_id IS 'Server-owned Stripe checkout binding; never writable by customers.';
CREATE OR REPLACE FUNCTION public.secure_cart_price() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _price integer;
BEGIN
 SELECT price INTO _price FROM public.products WHERE collection = NEW.collection AND package = NEW.package AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;
 NEW.unit_price := _price;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.secure_cart_price() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER secure_cart_price BEFORE INSERT OR UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.secure_cart_price();