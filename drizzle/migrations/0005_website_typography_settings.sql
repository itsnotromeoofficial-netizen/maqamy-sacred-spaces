CREATE TABLE public.typography_settings (
 id text PRIMARY KEY DEFAULT 'website' CHECK (id = 'website'),
 settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.typography_settings TO anon, authenticated;
GRANT ALL ON public.typography_settings TO service_role;
ALTER TABLE public.typography_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public typography settings" ON public.typography_settings FOR SELECT TO anon, authenticated USING (id = 'website');