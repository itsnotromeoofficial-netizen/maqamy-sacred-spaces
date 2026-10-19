CREATE TABLE public.banners (
  id uuid not null default gen_random_uuid() primary key,
  kind text not null default 'image',
  url text not null,
  title text not null default '',
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active banners" ON public.banners FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Public can read banner files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'banners');
CREATE POLICY "Service role manages banner files" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'banners') WITH CHECK (bucket_id = 'banners');