CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id TEXT PRIMARY KEY,
  placement_key TEXT NOT NULL CHECK (placement_key IN ('horizontal-1', 'horizontal-2', 'square-1', 'square-2')),
  campaign_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Ad' CHECK (label IN ('', 'Ad')),
  desktop_size TEXT NOT NULL CHECK (desktop_size IN ('468x60', '300x250')),
  mobile_size TEXT CHECK (mobile_size IN ('468x60', '300x250')),
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 999999),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_placement_status_priority
  ON public.ad_campaigns (placement_key, status, priority, starts_at, ends_at);

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

CREATE INDEX IF NOT EXISTS idx_admin_offers_status_schedule_order
  ON public.admin_offers (status, starts_at, ends_at, sort_order);

REVOKE ALL ON TABLE public.ad_campaigns FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_offers FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ad_campaigns TO bestforex_preview_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_offers TO bestforex_preview_runtime;

INSERT INTO public.ad_campaigns (
  id, placement_key, campaign_name, brand_name, image_url, destination_url, alt_text,
  label, desktop_size, mobile_size, priority, status
) VALUES
  ('horizontal-1', 'horizontal-1', 'House banner 468x60 #1', 'Advertise with BestForex.io', '/ads/banner-468x60-1.jpg', '/media-kit', 'Advertise with BestForex.io — Reach active forex traders', '', '468x60', '468x60', 1, 'active'),
  ('horizontal-2', 'horizontal-2', 'House banner 468x60 #2', 'Advertise with BestForex.io', '/ads/banner-468x60-2.jpg', '/media-kit', 'Grow your forex brand — Advertise with BestForex.io', '', '468x60', '468x60', 1, 'active'),
  ('square-1', 'square-1', 'House banner 300x250 #1', 'Advertise with BestForex.io', '/ads/banner-300x250-1.jpg', '/media-kit', 'Advertise with BestForex.io — Media kit and ad inventory', '', '300x250', '300x250', 1, 'active'),
  ('square-2', 'square-2', 'House banner 300x250 #2', 'Advertise with BestForex.io', '/ads/banner-300x250-2.jpg', '/media-kit', 'Reach 1.5M+ forex traders — Advertise on BestForex.io', '', '300x250', '300x250', 1, 'active')
ON CONFLICT (id) DO NOTHING;

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
