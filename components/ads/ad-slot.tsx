'use client'

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getAdByPlacement } from '@/data/ads'
import type { AdPlacementKey, AdSize } from '@/lib/types'

/** True when the URL is a same-site path (internal link). */
function isInternal(url: string): boolean {
  return url.startsWith('/')
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

// Fluid mode: banners always keep their native aspect ratio (height derives
// from width), so the creative scales proportionally at every viewport instead
// of being center-cropped by object-cover. Capped at the native creative size
// so desktop renders it pixel-perfect at 1:1.
const fluidHeightClasses: Record<AdSize, string> = {
  '468x60': 'w-full aspect-[468/60] sm:max-w-[468px]',
  '300x250': 'w-full aspect-[300/250] sm:max-w-[300px]'
}

export function AdSlot({ placementKey, className, fallback, fluid = false, priority = false }: AdSlotProps) {
  const ad = getAdByPlacement(placementKey)
  
  // Show fallback placeholder if no ad found for this placement
  if (!ad) {
    if (fallback) return <>{fallback}</>
    // Default: show simple placeholder indicating ad space
    return <AdPlaceholder size="300x250" className={className} />
  }
  
  const containerClass = fluid
    ? cn('relative', fluidHeightClasses[ad.desktopSize], className)
    : cn('relative inline-block', sizeClasses[ad.desktopSize], className)

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
                ? '(max-width: 640px) 100vw, 640px'
                : ad.desktopSize === '468x60'
                  ? '468px'
                  : '300px'
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
                ? '(max-width: 640px) 100vw, 640px'
                : ad.desktopSize === '468x60'
                  ? '468px'
                  : '300px'
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
