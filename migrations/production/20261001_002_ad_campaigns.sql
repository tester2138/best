CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id TEXT PRIMARY KEY,
  placement_key TEXT NOT NULL CHECK (placement_key IN ('horizontal-1', 'horizontal-2', 'square-1', 'square-2')),
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'paid' CHECK (campaign_type IN ('paid', 'house')),
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

REVOKE ALL ON TABLE public.ad_campaigns FROM PUBLIC;

INSERT INTO public.ad_campaigns (
  id, placement_key, campaign_name, campaign_type, brand_name, image_url, destination_url,
  alt_text, label, desktop_size, mobile_size, priority, status
) VALUES
  ('horizontal-1', 'horizontal-1', 'House banner 468x60 #1', 'house', 'Advertise with BestForex.io', '/ads/banner-468x60-1.jpg', '/media-kit', 'Advertise with BestForex.io — Reach active forex traders', '', '468x60', '468x60', 1, 'active'),
  ('horizontal-2', 'horizontal-2', 'House banner 468x60 #2', 'house', 'Advertise with BestForex.io', '/ads/banner-468x60-2.jpg', '/media-kit', 'Grow your forex brand — Advertise with BestForex.io', '', '468x60', '468x60', 1, 'active'),
  ('square-1', 'square-1', 'House banner 300x250 #1', 'house', 'Advertise with BestForex.io', '/ads/banner-300x250-1.jpg', '/media-kit', 'Advertise with BestForex.io — Media kit and ad inventory', '', '300x250', '300x250', 1, 'active'),
  ('square-2', 'square-2', 'House banner 300x250 #2', 'house', 'Advertise with BestForex.io', '/ads/banner-300x250-2.jpg', '/media-kit', 'Reach 1.5M+ forex traders — Advertise on BestForex.io', '', '300x250', '300x250', 1, 'active')
ON CONFLICT (id) DO NOTHING;
