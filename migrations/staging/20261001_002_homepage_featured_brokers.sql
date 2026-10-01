CREATE TABLE IF NOT EXISTS public.homepage_featured_brokers (
  slot SMALLINT PRIMARY KEY CHECK (slot IN (1, 2)),
  broker_slug TEXT NOT NULL UNIQUE CHECK (length(trim(broker_slug)) > 0),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE public.homepage_featured_brokers FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.homepage_featured_brokers TO bestforex_preview_runtime;
