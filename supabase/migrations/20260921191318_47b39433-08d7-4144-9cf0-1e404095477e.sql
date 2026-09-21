CREATE TABLE IF NOT EXISTS public.app_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('android','ios','web')),
  version text NOT NULL,
  version_code bigint,
  ipfs_cid text,
  download_url text,
  sha256 text,
  size_bytes bigint,
  notes text,
  mandatory boolean NOT NULL DEFAULT false,
  released_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, version)
);

CREATE INDEX IF NOT EXISTS app_releases_platform_released_idx
  ON public.app_releases (platform, released_at DESC);

GRANT SELECT ON public.app_releases TO anon;
GRANT SELECT ON public.app_releases TO authenticated;
GRANT ALL ON public.app_releases TO service_role;

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published releases" ON public.app_releases;
CREATE POLICY "Anyone can read published releases"
  ON public.app_releases FOR SELECT TO anon, authenticated
  USING (true);