'use client'

import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { getAdByPlacement } from '@/data/ads'
import type { AdPlacement, AdPlacementKey, AdSize } from '@/lib/types'

/**
 * Live campaign delivery: the slot renders the static house banner on first
 * paint (no layout shift, no hydration mismatch), then swaps to the campaign
 * currently serving in `ad_campaigns` once /api/ads resolves. When the API is
 * unavailable or returns no campaign, the static banner stays.
 */
const adFetcher = async (url: string): Promise<{ ad: AdPlacement | null } | null> => {
  const res = await fetch(url)
  return res.ok ? res.json() : null
}

/** True when the URL is a same-site path (internal link). */
function isInternal(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\') && !url.includes('\\')
}

interface AdSlotProps {
  placementKey: AdPlacementKey
  className?: string
  fallback?: React.ReactNode
  /** When true the slot expands to fill its parent instead of using a fixed size */
  fluid?: boolean
  /** Eager-load the creative — set on above-fold slots that are the LCP element */
  priority?: boolean
}

// Only 2 banner sizes: 468x60 (horizontal) and 300x250 (square)
const sizeClasses: Record<AdSize, string> = {
  '468x60': 'w-[468px] h-[60px]',
  '300x250': 'w-[300px] h-[250px]'
}

const responsiveSizeClasses: Record<string, string> = {
  '468x60-468x60': 'w-[468px] h-[60px]',
  '300x250-300x250': 'w-[300px] h-[250px]',
  '300x250-468x60': 'w-[300px] h-[250px] sm:w-[468px] sm:h-[60px]',
  '468x60-300x250': 'w-[468px] h-[60px] sm:w-[300px] sm:h-[250px]',
}

const fluidSizeClasses: Record<string, string> = {
  '468x60-468x60': 'w-full aspect-[468/60] sm:max-w-[468px]',
  '300x250-300x250': 'w-full aspect-[300/250] sm:max-w-[300px]',
  '300x250-468x60': 'w-full aspect-[300/250] sm:aspect-[468/60] sm:max-w-[468px]',
  '468x60-300x250': 'w-full aspect-[468/60] sm:aspect-[300/250] sm:max-w-[300px]',
}

function sizePair(mobile: AdSize, desktop: AdSize): string {
  return `${mobile}-${desktop}`
}

export function AdSlot({ placementKey, className, fallback, fluid = false, priority = false }: AdSlotProps) {
  const { data } = useSWR<{ ad: AdPlacement | null } | null>(
    `/api/ads/${placementKey}`,
    adFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )
  const ad = data?.ad ?? getAdByPlacement(placementKey)
  
  // Show fallback placeholder if no ad found for this placement
  if (!ad) {
    if (fallback) return <>{fallback}</>
    // Default: show simple placeholder indicating ad space
    return <AdPlaceholder size="300x250" className={className} />
  }
  
  const mobileSize = ad.mobileSize ?? ad.desktopSize
  const containerClass = fluid
    ? cn('relative', fluidSizeClasses[sizePair(mobileSize, ad.desktopSize)], className)
    : cn('relative inline-block', responsiveSizeClasses[sizePair(mobileSize, ad.desktopSize)], className)
  const mobileImageWidth = mobileSize === '468x60' ? 468 : 300
  const desktopImageWidth = ad.desktopSize === '468x60' ? 468 : 300

  return (
    <div className={containerClass}>
      {/* T27: only show label badge when label is non-empty (real paid ad) */}
      {ad.label && (
        <span className="absolute top-1.5 left-2 z-10 text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm leading-none">
          {ad.label}
        </span>
      )}
      {/* P2-216: internal links (e.g. /media-kit house ads) must never carry
          nofollow. Use Next.js <Link> for internal paths and <a rel="sponsored
          noopener"> for external paid placements. */}
      {isInternal(ad.destinationUrl) ? (
        <Link
          href={ad.destinationUrl}
          className="relative block w-full h-full rounded-xl overflow-hidden border border-border/30 shadow-sm hover:shadow-md transition-shadow"
          aria-label={ad.altText}
        >
          <Image
            src={ad.imageUrl}
            alt={ad.altText}
            fill
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className="object-cover"
            sizes={
              fluid
                ? `(max-width: 640px) 100vw, ${desktopImageWidth}px`
                : `(max-width: 640px) ${mobileImageWidth}px, ${desktopImageWidth}px`
            }
          />
        </Link>
      ) : (
        <a
          href={ad.destinationUrl}
          rel="sponsored noopener"
          target="_blank"
          className="relative block w-full h-full rounded-xl overflow-hidden border border-border/30 shadow-sm hover:shadow-md transition-shadow"
          aria-label={ad.altText}
        >
          <Image
            src={ad.imageUrl}
            alt={ad.altText}
            fill
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className="object-cover"
            sizes={
              fluid
                ? `(max-width: 640px) 100vw, ${desktopImageWidth}px`
                : `(max-width: 640px) ${mobileImageWidth}px, ${desktopImageWidth}px`
            }
          />
        </a>
      )}
    </div>
  )
}

// T27: Placeholder shown when no paid ad is booked — self-promo linking /media-kit.
// "Sponsored" label removed; "Ad" label only appears on real paid placements.
function AdPlaceholder({ 
  size = '300x250', 
  className 
}: { 
  size?: AdSize
  className?: string 
}) {
  // Row 216: internal link — plain Next.js Link; no rel attribute (never nofollow on internal hrefs).
  return (
    <Link
      href="/media-kit"
      className={cn('relative block rounded-lg overflow-hidden border border-dashed border-primary/30 hover:border-primary/60 transition-colors', sizeClasses[size], className)}
      aria-label="Advertise with BestForex.io"
    >
      <div className="w-full h-full bg-primary/[0.03] flex flex-col items-center justify-center gap-1">
        <p className="text-xs font-semibold text-primary">Advertise here</p>
        <p className="text-[10px] text-muted-foreground">bestforex.io/media-kit</p>
      </div>
    </Link>
  )
}
