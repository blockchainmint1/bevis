-- verification_records: no public enumeration of the mint registry.
-- All reads happen server-side with the service role (single exact lookups).
DROP POLICY IF EXISTS "verification public read" ON public.verification_records;
REVOKE SELECT ON public.verification_records FROM anon;
GRANT ALL ON public.verification_records TO service_role;

-- Admins keep full read/write access via the existing
-- "admins write verification" policy (FOR ALL, has_role admin).

-- products: not read by the application at all; admins only.
DROP POLICY IF EXISTS "products public read" ON public.products;
REVOKE SELECT ON public.products FROM anon;
GRANT ALL ON public.products TO service_role;