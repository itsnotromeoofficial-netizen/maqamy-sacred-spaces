ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
COMMENT ON COLUMN public.orders.payment_status IS 'Payment state synced from payments webhook: unpaid, paid, failed';
