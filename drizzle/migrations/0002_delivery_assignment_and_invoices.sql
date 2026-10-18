ALTER TABLE public.orders ADD COLUMN assigned_to uuid NULL REFERENCES public.admin_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN approved_by text NULL;
COMMENT ON COLUMN public.orders.assigned_to IS 'Delivery team member responsible for this order';

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL DEFAULT ('INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  user_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invoices_order_number_idx ON public.invoices (order_number);

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view their own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);