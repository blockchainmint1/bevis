CREATE TABLE IF NOT EXISTS public.ops_alert_state (
  key text PRIMARY KEY,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  last_value numeric,
  note text
);

GRANT ALL ON public.ops_alert_state TO service_role;
ALTER TABLE public.ops_alert_state ENABLE ROW LEVEL SECURITY;

INSERT INTO public.user_roles (user_id, role)
VALUES ('435a0b4d-1383-4a0e-aa33-4437fce34707', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;