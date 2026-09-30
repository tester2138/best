CREATE TABLE IF NOT EXISTS public.admin_profile_overrides (
  slug TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9][a-z0-9.-]{0,118}[a-z0-9]$|^[a-z0-9]$'),
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(overrides) = 'object'),
  updated_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS contract_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contract_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contract_contact_phone TEXT;

REVOKE ALL ON TABLE public.admin_profile_overrides FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_profile_overrides TO bestforex_preview_runtime;

GRANT SELECT, UPDATE (
  renewal_date,
  contract_contact_name,
  contract_contact_email,
  contract_contact_phone
) ON TABLE public.brands TO bestforex_preview_runtime;

GRANT INSERT (
  slug,
  name,
  website,
  verification_status,
  is_sponsored,
  is_featured,
  display_rank,
  rating_score,
  brand_category,
  brand_status,
  regulator_tier,
  internal_notes,
  needs_manual_review,
  internal_priority,
  is_duplicate,
  renewal_date,
  contract_contact_name,
  contract_contact_email,
  contract_contact_phone,
  verification_reviewed_at,
  updated_at
) ON TABLE public.brands TO bestforex_preview_runtime;

GRANT UPDATE (
  name,
  website,
  verification_status,
  is_sponsored,
  is_featured,
  display_rank,
  rating_score,
  brand_category,
  brand_status,
  regulator_tier,
  internal_notes,
  needs_manual_review,
  internal_priority,
  is_duplicate,
  renewal_date,
  contract_contact_name,
  contract_contact_email,
  contract_contact_phone,
  verification_reviewed_at,
  updated_at
) ON TABLE public.brands TO bestforex_preview_runtime;

GRANT SELECT ON TABLE public.brands TO bestforex_preview_runtime;
GRANT USAGE, SELECT ON SEQUENCE public.brands_id_seq TO bestforex_preview_runtime;
