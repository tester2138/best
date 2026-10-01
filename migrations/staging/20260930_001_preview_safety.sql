CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.preview_environment (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  environment TEXT NOT NULL,
  neon_project_id TEXT NOT NULL,
  neon_branch_id TEXT NOT NULL,
  neon_endpoint_id TEXT NOT NULL,
  database_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.preview_smoke_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.preview_environment (
  id,
  environment,
  neon_project_id,
  neon_branch_id,
  neon_endpoint_id,
  database_name
)
VALUES (
  1,
  'staging',
  'flat-butterfly-48885553',
  'br-dawn-credit-aqzydokc',
  'ep-raspy-snow-aqusk7qe',
  'neondb'
)
ON CONFLICT (id) DO UPDATE SET
  environment = EXCLUDED.environment,
  neon_project_id = EXCLUDED.neon_project_id,
  neon_branch_id = EXCLUDED.neon_branch_id,
  neon_endpoint_id = EXCLUDED.neon_endpoint_id,
  database_name = EXCLUDED.database_name;

REVOKE ALL ON TABLE public.preview_environment FROM PUBLIC;
REVOKE ALL ON TABLE public.preview_smoke_checks FROM PUBLIC;
REVOKE ALL ON TABLE public.schema_migrations FROM PUBLIC, bestforex_preview_runtime;
GRANT SELECT ON TABLE public.preview_environment TO bestforex_preview_runtime;
GRANT SELECT, INSERT, DELETE ON TABLE public.preview_smoke_checks TO bestforex_preview_runtime;
