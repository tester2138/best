ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS editor_note TEXT;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contract_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contract_contact_phone TEXT;

CREATE TABLE IF NOT EXISTS public.editorial_authors (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  beat TEXT[] NOT NULL DEFAULT '{}',
  same_as TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.editorial_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('learn_page', 'glossary_term', 'corrections_policy')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'coming_soon')),
  meta_title TEXT,
  meta_description TEXT,
  related_terms TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);

CREATE TABLE IF NOT EXISTS public.admin_offers (
  id TEXT PRIMARY KEY,
  broker_id TEXT NOT NULL,
  broker_name TEXT NOT NULL,
  broker_logo TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  value TEXT NOT NULL,
  code TEXT,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'no-deposit', 'cashback', 'rebate', 'other')),
  terms TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_exclusive BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.admin_profile_overrides (
  slug TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9][a-z0-9.-]{0,118}[a-z0-9]$|^[a-z0-9]$'),
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(overrides) = 'object'),
  updated_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.homepage_featured_brokers (
  slot SMALLINT PRIMARY KEY CHECK (slot IN (1, 2)),
  broker_slug TEXT NOT NULL UNIQUE CHECK (length(trim(broker_slug)) > 0),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.admin_offers (
  id, broker_id, broker_name, broker_logo, title, description, value, type, terms,
  affiliate_url, is_featured, is_exclusive, status, sort_order
) VALUES
  ('offer-xm-1', 'xm', 'XM', '/logos/brokers/xm.svg', '$30 No Deposit Bonus', 'Start trading with $30 free credit. No deposit required. Available to new clients only.', '$30', 'no-deposit', 'New clients only. Profits withdrawable after trading requirements met. T&Cs apply.', 'https://www.xm.com/bonus/?ref=bestforex', true, false, 'active', 1),
  ('offer-xm-2', 'xm', 'XM', '/logos/brokers/xm.svg', '50% + 20% Deposit Bonus', 'Get 50% bonus on your first $500 deposit plus 20% on the next $4,500.', 'Up to $5,000', 'deposit', 'Bonus not withdrawable. Volume requirements apply. T&Cs apply.', 'https://www.xm.com/bonus/?ref=bestforex', true, false, 'active', 2),
  ('offer-capital-com-1', 'capital-com', 'Capital.com', '/logos/brokers/capital-com.svg', 'Commission-Free CFD Trading', 'Trade 3,000+ instruments with zero commission and spreads from 0.2 pips. Start from just $20 with AI-powered trading insights.', '$20 min deposit', 'other', 'Spreads apply. CFDs are complex instruments and carry risk of losing money rapidly. T&Cs apply.', 'https://capital.com/?ref=bestforex', true, true, 'active', 3),
  ('offer-avatrade-1', 'avatrade', 'AvaTrade', '/logos/brokers/avatrade.svg', 'Welcome Bonus', 'Get up to $10,000 trading bonus on your first deposit with AvaTrade.', 'Up to $10,000', 'deposit', 'Volume requirements apply. Bonus not available in all regions. T&Cs apply.', 'https://www.avatrade.com/bonus/?ref=bestforex', false, false, 'active', 4),
  ('offer-pepperstone-1', 'pepperstone', 'Pepperstone', '/logos/brokers/pepperstone.svg', 'Razor Account - Raw Spreads', 'Trade with raw spreads from 0.0 pips. No minimum deposit required.', '0.0 pip spreads', 'other', 'Commission applies. T&Cs apply.', 'https://www.pepperstone.com/razor/?ref=bestforex', true, false, 'active', 5),
  ('offer-etoro-1', 'etoro', 'eToro', '/logos/brokers/etoro.svg', '0% Commission Stocks', 'Invest in real stocks with 0% commission. Copy top traders automatically.', '0% commission', 'other', 'Other fees may apply. Capital at risk. T&Cs apply.', 'https://www.etoro.com/stocks/?ref=bestforex', true, false, 'active', 6)
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON TABLE public.admin_offers, public.editorial_authors, public.editorial_content, public.homepage_featured_brokers, public.admin_profile_overrides FROM PUBLIC;
