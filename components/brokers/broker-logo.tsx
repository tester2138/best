'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// Brand colors for the initials fallback (when no real logo is available)
const brandColors: Record<string, { bg: string; text: string }> = {
  bluesuisse: { bg: '#0066CC', text: '#FFFFFF' },
  'saxo-bank': { bg: '#00263D', text: '#FFFFFF' },
  'capital-com': { bg: '#181B2E', text: '#FFFFFF' },
  ig: { bg: '#DC0032', text: '#FFFFFF' },
  xm: { bg: '#2E7D32', text: '#FFFFFF' },
  fxcm: { bg: '#1A237E', text: '#FFFFFF' },
  etoro: { bg: '#4DB6AC', text: '#FFFFFF' },
  avatrade: { bg: '#1565C0', text: '#FFFFFF' },
  'cmc-markets': { bg: '#0D47A1', text: '#FFFFFF' },
  plus500: { bg: '#00BCD4', text: '#FFFFFF' },
  pepperstone: { bg: '#1976D2', text: '#FFFFFF' }
}

// Map each broker slug to its real brand domain so Logo.dev can fetch the
// official, high-resolution logo. Logo.dev resolves logos by domain.
const brokerDomains: Record<string, string> = {
  bluesuisse: 'bluesuisse.com',
  'saxo-bank': 'home.saxo',
  'forex-com': 'forex.com',
  dukascopy: 'dukascopy.com',
  swissquote: 'swissquote.com',
  'capital-com': 'capital.com',
  eightcap: 'eightcap.com',
  ninjatrader: 'ninjatrader.com',
  tastyfx: 'tastyfx.com',
  'moneta-markets': 'monetamarkets.com',
  vantage: 'vantagemarkets.com',
  'fusion-markets': 'fusionmarkets.com',
  ig: 'ig.com',
  pepperstone: 'pepperstone.com',
  xm: 'xm.com',
  'ic-markets': 'icmarkets.com',
  etoro: 'etoro.com',
  exness: 'exness.com',
  fxcm: 'fxcm.com',
  oanda: 'oanda.com',
  avatrade: 'avatrade.com',
  'cmc-markets': 'cmcmarkets.com',
  plus500: 'plus500.com'
}

// Logo.dev publishable token. This key is safe to expose publicly (it appears
// directly in the image URL). Prefer an env var override if one is set.
const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN || 'pk_Tmo2hKF-Q4-mqKv9OQsGBA'

interface BrokerLogoProps {
  name: string
  slug: string
  logoUrl?: string
  /** Full website URL (e.g. "https://pepperstone.com") — domain is extracted automatically */
  websiteUrl?: string
  /** Explicit domain override — takes priority over websiteUrl and slug map */
  domain?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/** Extract a clean hostname from any URL string (handles missing protocol too) */
function extractDomain(url: string): string {
  try {
    const withProtocol = url.startsWith('http') ? url : `https://${url}`
    return new URL(withProtocol).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  }
}

const sizeMap = {
  sm: { container: 'w-10 h-10', text: 'text-xs', image: 40 },
  md: { container: 'w-14 h-14', text: 'text-sm', image: 56 },
  lg: { container: 'w-20 h-20', text: 'text-base', image: 80 },
  xl: { container: 'w-24 h-24', text: 'text-lg', image: 96 }
}

/**
 * Build the ordered list of logo URLs to try for a broker.
 * 1. Logo.dev (real, square, high-res by domain) — primary
 * 2. Existing local logo file (logoUrl or /logos/brokers/{slug}.png|.svg)
 * 3. Initials fallback (handled separately once all image sources fail)
 */
function buildLogoCandidates(slug: string, logoUrl?: string, domain?: string, websiteUrl?: string, displayPx = 56): string[] {
  const candidates: string[] = []
  // Priority: explicit domain prop > websiteUrl extraction > slug→domain map
  const resolvedDomain = domain || (websiteUrl ? extractDomain(websiteUrl) : null) || brokerDomains[slug]

  const isRemoteLogo = logoUrl?.startsWith('https://') || logoUrl?.startsWith('http://')

  // Approved remote database media is authoritative. Relative catalog paths
  // are only fallbacks because many legacy records point at files that were
  // never added to /public.
  if (isRemoteLogo && logoUrl) {
    candidates.push(logoUrl)
  }

  if (LOGO_DEV_TOKEN && resolvedDomain) {
    const assetSize = Math.min(displayPx * 2, 256)
    candidates.push(
      `https://img.logo.dev/${resolvedDomain}?token=${LOGO_DEV_TOKEN}&size=${assetSize}&format=png`
    )
  }

  if (logoUrl && !isRemoteLogo) {
    candidates.push(logoUrl)
  } else if (!logoUrl) {
    candidates.push(`/logos/brokers/${slug}.png`)
    candidates.push(`/logos/brokers/${slug}.svg`)
  }

  return [...new Set(candidates)]
}

export function BrokerLogo({ name, slug, logoUrl, websiteUrl, domain, size = 'md', className }: BrokerLogoProps) {
  const candidates = buildLogoCandidates(slug, logoUrl, domain, websiteUrl, sizeMap[size].image)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const sourceKey = `${slug}|${logoUrl ?? ''}|${domain ?? ''}|${websiteUrl ?? ''}|${size}`

  useEffect(() => {
    setCandidateIndex(0)
  }, [sourceKey])

  const colors = brandColors[slug] || { bg: '#6B7280', text: '#FFFFFF' }
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const sizeConfig = sizeMap[size]

  const currentSrc = candidates[candidateIndex]
  const exhausted = candidateIndex >= candidates.length

  // All image sources failed — render branded initials
  if (exhausted || !currentSrc) {
    return (
      <div
        className={cn(
          'rounded-xl flex items-center justify-center font-bold flex-shrink-0',
          sizeConfig.container,
          sizeConfig.text,
          className
        )}
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {initials}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center bg-white border border-border overflow-hidden flex-shrink-0',
        sizeConfig.container,
        className
      )}
    >
      {/* Plain img is used (not next/image) so the on-error fallback chain works
          reliably across external Logo.dev URLs and local files. */}
      {/* data-nosnippet: tells Googlebot not to use this broker logo as the
          representative image for the page in search results. Without this,
          Google may pick up the first prominent broker logo (e.g. Saxo Bank)
          as the site thumbnail instead of the og:image we declare. */}
      <img
        src={currentSrc || "/placeholder.svg"}
        alt={`${name} logo`}
        width={sizeConfig.image}
        height={sizeConfig.image}
        className="object-contain p-1.5 w-full h-full"
        loading="lazy"
        data-nosnippet
        onError={() => setCandidateIndex((i) => i + 1)}
      />
    </div>
  )
}

// Strip of broker logos for trust section
export function BrokerLogoStrip({ brokers, className }: {
  brokers: { name: string; slug: string; logo?: string }[]
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-6 overflow-x-auto pb-2', className)}>
      {brokers.map((broker) => (
        <BrokerLogo
          key={broker.slug}
          name={broker.name}
          slug={broker.slug}
          logoUrl={broker.logo}
          size="md"
        />
      ))}
    </div>
  )
}
