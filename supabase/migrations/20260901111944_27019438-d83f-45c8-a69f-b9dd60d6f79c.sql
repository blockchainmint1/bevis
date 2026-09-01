create table if not exists public.bevis_legacy_users (
  legacy_id uuid primary key,
  email text not null unique,
  password_hash text,
  first_name text,
  last_name text,
  default_currency text,
  activated boolean not null default false,
  legacy_created_at timestamptz,
  saved_assets integer not null default 0,
  imported_user_id uuid,
  imported_at timestamptz,
  import_error text,
  created_at timestamptz not null default now()
);

grant all on public.bevis_legacy_users to service_role;

alter table public.bevis_legacy_users enable row level security;
-- No policies: only server-side privileged code may read these rows.

create index if not exists bevis_legacy_users_pending_idx
  on public.bevis_legacy_users (imported_at) where imported_at is null;