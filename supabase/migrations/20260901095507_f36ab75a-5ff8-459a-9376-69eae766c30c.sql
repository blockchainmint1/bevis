CREATE TABLE public.bevis_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL UNIQUE,
  chain TEXT NOT NULL DEFAULT 'txc',
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bevis_assets TO authenticated;
GRANT ALL ON public.bevis_assets TO service_role;
ALTER TABLE public.bevis_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their assets" ON public.bevis_assets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bevis_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_uuid UUID NOT NULL REFERENCES public.bevis_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL,
  encrypted BOOLEAN NOT NULL DEFAULT false,
  storage_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  anchor_status TEXT NOT NULL DEFAULT 'pending',
  anchor_txid TEXT,
  anchor_error TEXT,
  anchored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bevis_files_asset_idx ON public.bevis_files (asset_uuid, created_at DESC);
CREATE INDEX bevis_files_sha_idx ON public.bevis_files (sha256);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bevis_files TO authenticated;
GRANT ALL ON public.bevis_files TO service_role;
ALTER TABLE public.bevis_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their files" ON public.bevis_files FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bevis_asset_keys (
  asset_uuid UUID NOT NULL PRIMARY KEY REFERENCES public.bevis_assets(id) ON DELETE CASCADE,
  priv_key_hex TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.bevis_asset_keys TO service_role;
ALTER TABLE public.bevis_asset_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their bevis files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bevis-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners upload their bevis files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bevis-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners delete their bevis files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bevis-files' AND auth.uid()::text = (storage.foldername(name))[1]);