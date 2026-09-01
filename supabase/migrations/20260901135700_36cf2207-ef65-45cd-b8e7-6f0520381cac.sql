ALTER TABLE public.bevis_assets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.bevis_files ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.bevis_assets ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE public.bevis_files ADD COLUMN IF NOT EXISTS device_id text;
CREATE INDEX IF NOT EXISTS bevis_assets_device_id_idx ON public.bevis_assets (device_id);
CREATE INDEX IF NOT EXISTS bevis_files_device_id_idx ON public.bevis_files (device_id);