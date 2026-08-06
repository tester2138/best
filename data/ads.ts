import type { AdPlacement } from '@/lib/types'

/**
 * BestForex.io Banner System — T27 update.
 *
 * House banners are self-promo only (no real advertisers yet). Per T27:
 * - "Sponsored" label removed; label field is now empty for house banners.
 * - destinationUrl points to /media-kit (Advertise with us CTA).
 * - Max 2 placements per page is enforced in the AdSlot component.
 * When a real paid campaign is booked, add its entry here with label: 'Ad'.
 */

export const adPlacements: AdPlacement[] = [
  // Horizontal Banner 1 (468x60)
  {
    id: 'horizontal-1',
    placementKey: 'horizontal-1',
    brandName: 'Advertise with BestForex.io',
    imageUrl: '/ads/banner-468x60-1.jpg',
    destinationUrl: '/media-kit',
    altText: 'Advertise with BestForex.io — Reach active forex traders',
    label: '',
    desktopSize: '468x60',
    mobileSize: '468x60',
    priority: 1,
    active: true
  },
  // Horizontal Banner 2 (468x60)
  {
    id: 'horizontal-2',
    placementKey: 'horizontal-2',
    brandName: 'Advertise with BestForex.io',
    imageUrl: '/ads/banner-468x60-2.jpg',
    destinationUrl: '/media-kit',
    altText: 'Grow your forex brand — Advertise with BestForex.io',
    label: '',
    desktopSize: '468x60',
    mobileSize: '468x60',
    priority: 1,
    active: true
  },
  // Square Banner 1 (300x250)
  {
    id: 'square-1',
    placementKey: 'square-1',
    brandName: 'Advertise with BestForex.io',
    imageUrl: '/ads/banner-300x250-1.jpg',
    destinationUrl: '/media-kit',
    altText: 'Advertise with BestForex.io — Media kit and ad inventory',
    label: '',
    desktopSize: '300x250',
    mobileSize: '300x250',
    priority: 1,
    active: true
  },
  // Square Banner 2 (300x250)
  {
    id: 'square-2',
    placementKey: 'square-2',
    brandName: 'Advertise with BestForex.io',
    imageUrl: '/ads/banner-300x250-2.jpg',
    destinationUrl: '/media-kit',
    altText: 'Reach 1.5M+ forex traders — Advertise on BestForex.io',
    label: '',
    desktopSize: '300x250',
    mobileSize: '300x250',
    priority: 1,
    active: true
  }
]

export function getAdByPlacement(placementKey: string): AdPlacement | undefined {
  const now = new Date()
  return adPlacements
    .filter(ad => {
      if (!ad.active) return false
      if (ad.startsAt && new Date(ad.startsAt) > now) return false
      if (ad.endsAt && new Date(ad.endsAt) < now) return false
      return ad.placementKey === placementKey
    })
    .sort((a, b) => a.priority - b.priority)[0]
}

export function getAdsByPlacement(placementKey: string): AdPlacement[] {
  const now = new Date()
  return adPlacements
    .filter(ad => {
      if (!ad.active) return false
      if (ad.startsAt && new Date(ad.startsAt) > now) return false
      if (ad.endsAt && new Date(ad.endsAt) < now) return false
      return ad.placementKey === placementKey
    })
    .sort((a, b) => a.priority - b.priority)
}
