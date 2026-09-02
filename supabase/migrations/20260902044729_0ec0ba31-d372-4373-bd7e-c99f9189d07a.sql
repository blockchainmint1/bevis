CREATE TABLE public.fuel_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  owner_key text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  address text,
  txc_amount numeric,
  txid text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_topups_owner_key ON public.fuel_topups(owner_key);

GRANT SELECT ON public.fuel_topups TO authenticated;
GRANT ALL ON public.fuel_topups TO service_role;

ALTER TABLE public.fuel_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own topups read" ON public.fuel_topups
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_fuel_topups_updated_at
  BEFORE UPDATE ON public.fuel_topups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();