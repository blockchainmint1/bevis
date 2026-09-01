ALTER TABLE public.bevis_files
  ADD COLUMN IF NOT EXISTS file_cid TEXT,
  ADD COLUMN IF NOT EXISTS manifest_cid TEXT,
  ADD COLUMN IF NOT EXISTS anchor_address TEXT;