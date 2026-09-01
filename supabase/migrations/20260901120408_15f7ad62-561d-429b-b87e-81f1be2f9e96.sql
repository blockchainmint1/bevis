update public.bevis_legacy_users set password_hash = null where password_hash is not null;
alter table public.bevis_legacy_users drop column password_hash;