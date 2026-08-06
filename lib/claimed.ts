import 'server-only'
import { unstable_cache } from 'next/cache'
import { query, queryOne } from '@/lib/portal/db'
import type { SectionKey } from '@/lib/content/registry'
import type { Brand, Offer, MediaAsset } from '@/types/portal'

/**
 * Public-facing view of a claimed brand (Blueprint Section 15.1).
 *
 * Returns `null` for any slug that is not an actively claimed brand, so the
 * public broker page falls straight back to its existing static/editorial
 * markup. Only PUBLISHED section content, ACTIVE offers (within their date
 * window) and APPROVED media are exposed — draft / pending / rejected content
 * never leaks to the public.
 *
 * The result is wrapped in `unstable_cache` tagged `broker:<slug>` so it is
 * effectively free on repeat requests and is busted the instant a brand
 * publishes, via `revalidateBrand()` (lib/portal/revalidate.ts).
 */

type ClaimedBrand = Pick<
  Brand,
  'id' | 'name' | 'slug' | 'is_claimed' | 'portal_access' | 'claimed_at'
>

export interface ClaimedData {
  brand: ClaimedBrand
  /** Published content keyed by section, e.g. sections.hero, sections.about. */
  sections: Partial<Record<SectionKey, Record<string, unknown>>>
  offers: Offer[]
  logo: MediaAsset | null
  screenshots: MediaAsset[]
  lastPublishedAt: string | null
}

async function loadClaimedData(slug: string): Promise<ClaimedData | null> {
  const brand = await queryOne<ClaimedBrand & { portal_access: Brand['portal_access'] }>(
    `select id, name, slug, is_claimed, portal_access, claimed_at
       from public.brands
      where slug = $1
      limit 1`,
    [slug],
  )

  // Shell brands (created by an un-actioned claim) have is_claimed = false and
  // stay invisible until an admin assigns them (Blueprint Section 15.4).
  if (!brand || !brand.is_claimed) return null

  const [sectionRows, offers, media] = await Promise.all([
    query<{ section_key: SectionKey; published: Record<string, unknown>; published_at: string }>(
      `select section_key, published, published_at
         from public.broker_page_sections
        where brand_id = $1 and published is not null`,
      [brand.id],
    ),
    query<Offer>(
      `select * from public.offers
        where brand_id = $1 and status = 'active'
        order by sort_order asc, created_at asc`,
      [brand.id],
    ),
    query<MediaAsset>(
      `select * from public.media_assets
        where brand_id = $1 and status = 'approved'
        order by sort_order asc, created_at asc`,
      [brand.id],
    ),
  ])

  const now = Date.now()
  const activeOffers = offers.filter((o) => {
    const startsOk = !o.starts_at || Date.parse(o.starts_at) <= now
    const endsOk = !o.ends_at || Date.parse(o.ends_at) >= now
    return startsOk && endsOk
  })

  const sections: Partial<Record<SectionKey, Record<string, unknown>>> = {}
  for (const row of sectionRows) {
    sections[row.section_key] = row.published
  }

  const publishedDates = sectionRows
    .map((r) => r.published_at)
    .filter(Boolean)
    .sort()

  return {
    brand,
    sections,
    offers: activeOffers,
    logo: media.find((m) => m.kind === 'logo') ?? null,
    screenshots: media.filter((m) => m.kind === 'screenshot'),
    lastPublishedAt: publishedDates.at(-1) ?? null,
  }
}

export function getClaimedData(slug: string): Promise<ClaimedData | null> {
  return unstable_cache(() => loadClaimedData(slug), ['claimed-data', slug], {
    tags: [`broker:${slug}`],
  })()
}
