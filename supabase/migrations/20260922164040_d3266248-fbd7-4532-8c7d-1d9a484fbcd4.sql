CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  collection text NOT NULL,
  package text NOT NULL,
  description text NOT NULL DEFAULT '',
  specifications text[] NOT NULL DEFAULT '{}',
  price integer NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection, package)
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT TO anon, authenticated USING (active = true);
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.products (name, collection, package, description, specifications, price, stock, display_order) VALUES
('Noor Essential', 'Noor', 'Essential', 'Light in Every Day', ARRAY['Mihrab', 'Prayer Rug'], 280000, 10, 10),
('Noor Signature', 'Noor', 'Signature', 'Light in Every Day', ARRAY['Mihrab', 'Prayer Rug', 'Side Table', 'LED', 'Quran Stand', 'Packaging'], 550000, 10, 20),
('Noor Bespoke', 'Noor', 'Bespoke', 'Light in Every Day', ARRAY['Custom design', 'Wall panels', 'Full installation'], 850000, 10, 30),
('Janna Essential', 'Janna', 'Essential', 'A Garden at Home', ARRAY['Mihrab', 'Prayer Rug'], 320000, 10, 40),
('Janna Signature', 'Janna', 'Signature', 'A Garden at Home', ARRAY['Mihrab', 'Prayer Rug', 'Side Table', 'LED', 'Quran Stand', 'Packaging'], 580000, 10, 50),
('Janna Bespoke', 'Janna', 'Bespoke', 'A Garden at Home', ARRAY['Custom design', 'Wall panels', 'Full installation'], 950000, 10, 60);

ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_collection_check;
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_package_check;