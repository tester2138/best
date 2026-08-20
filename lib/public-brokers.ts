import 'server-only'

import { unstable_cache } from 'next/cache'
import { brokers as editorialBrokers } from '@/data/brokers'
import { directoryCompanies as editorialDirectory } from '@/data/directory'
import { query } from '@/lib/portal/db'
import { isRetailEntityType, type DirectoryCompany, type VerificationStatus } from '@/lib/directory-types'
import type { Broker } from '@/lib/types'

interface PublicBrandRow {
  slug: string
  website: string | null
  verification_status: 'verified' | 'unverified'
  is_sponsored: boolean
  is_featured: boolean
  logo_url: string | null
  display_rank: number | null
  /** Editorial score from master-ranking CSV (e.g. 3.9, 3.8). Applied to
   *  broker.rating via the overlay so it always matches the CSV. */
  rating_score: number | null
  /** TRUE for the second+ occurrence of the same slug in the CSV — hidden from
   *  the directory listing and marked noindex on their profile page. */
  is_duplicate: boolean
}

/**
 * Verified/sponsored brands shown pinned at the top of the Brokers directory
 * and homepage widgets. Order here matches the master-ranking CSV display_rank
 * within each tier (SPONSORED first, then VERIFIED by rank).
 *
 * Homepage top-5: saxo-bank, capital-com (sponsored), then forex-com,
 * dukascopy, fusion-markets (verified, lowest CSV rank numbers = highest prominence).
 */
const PINNED_DIRECTORY_SLUGS = [
  // Sponsored (CSV rank 12, 14 — shown first regardless of numeric rank)
  'saxo-bank',
  'capital-com',
  // Verified — sorted by CSV display_rank ascending
  'forex-com',       // CSV rank 15
  'dukascopy',       // CSV rank 35
  'fusion-markets',  // CSV rank 37
  'eightcap',        // CSV rank 36
  'ninjatrader',     // CSV rank 38
  'swissquote',      // CSV rank 39
  'tastyfx',         // CSV rank 40
  'vantage',         // CSV rank 42
  'moneta-markets',  // CSV rank 77
] as const

/** Top 5 shown on the homepage widget */
const PINNED_HOMEPAGE_SLUGS = PINNED_DIRECTORY_SLUGS.slice(0, 5) as readonly string[]

async function loadPublicBrandRows(): Promise<PublicBrandRow[]> {
  // The DB only supplies an OVERLAY on top of the static editorial directory.
  // Every merge helper below already tolerates a missing row, so if the
  // database is unavailable (quota, cold start, network) we degrade to the
  // static catalogue instead of throwing and tripping the error boundary.
  try {
    return await queryPublicBrandRows()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[public-brokers] brand overlay unavailable, serving static directory — ${message}`,
    )
    return []
  }
}

async function queryPublicBrandRows(): Promise<PublicBrandRow[]> {
  return query<PublicBrandRow>(
    `select b.slug,
            b.website,
            b.verification_status,
            b.is_sponsored,
            b.is_featured,
            b.display_rank,
            b.rating_score,
            coalesce(b.is_duplicate, false) as is_duplicate,
            logo.public_url as logo_url
       from public.brands b
       left join lateral (
         select m.public_url
           from public.media_assets m
          where m.brand_id = b.id
            and m.kind = 'logo'
            and m.status = 'approved'
          order by m.sort_order asc, m.created_at desc
          limit 1
       ) logo on true`,
  )
}

const getPublicBrandRows = unstable_cache(loadPublicBrandRows, ['public-broker-overlay-v2'], {
  tags: ['broker-directory'],
  revalidate: 300,
})

function statusFromRow(row: PublicBrandRow | undefined): VerificationStatus {
  return row?.verification_status === 'verified' ? 'verified' : 'unverified'
}

function rowMap(rows: PublicBrandRow[]): Map<string, PublicBrandRow> {
  return new Map(rows.map((row) => [row.slug.toLowerCase(), row]))
}

function mergeDirectoryCompany(
  company: DirectoryCompany,
  rows: Map<string, PublicBrandRow>,
): DirectoryCompany {
  const row = rows.get(company.slug.toLowerCase())
  return {
    ...company,
    verificationStatus: statusFromRow(row),
    isSponsored: row?.is_sponsored ?? false,
    isFeatured: row?.is_featured ?? false,
    websiteUrl: row?.website || company.websiteUrl,
    logoUrl: row?.logo_url || company.logoUrl,
    displayRank: row?.display_rank ?? undefined,
    // Apply the canonical CSV score; fall back to editorial rating if not seeded
    rating: row?.rating_score != null ? Number(row.rating_score) : company.rating,
    isDuplicate: row?.is_duplicate ?? false, // DB flag; no entries are currently duplicated
  }
}

function mergeBroker(broker: Broker, rows: Map<string, PublicBrandRow>): Broker {
  const row = rows.get(broker.slug.toLowerCase())
  return {
    ...broker,
    verificationStatus: statusFromRow(row),
    isSponsored: row?.is_sponsored ?? false,
    isFeatured: row?.is_featured ?? false,
    websiteUrl: row?.website || broker.websiteUrl,
    logoUrl: row?.logo_url || broker.logoUrl,
    // Apply the canonical CSV score to the broker rating
    rating: row?.rating_score != null ? Number(row.rating_score) : broker.rating,
  }
}

function tier(company: Pick<DirectoryCompany, 'isSponsored' | 'verificationStatus'>): number {
  if (company.isSponsored) return 0
  if (company.verificationStatus === 'verified') return 1
  return 2
}

/** Fallback rank for items without a DB display_rank: place at end */
const RANK_FALLBACK = 999999

export function rankPublicDirectory(companies: DirectoryCompany[]): DirectoryCompany[] {
  const retail = companies.filter((company) => isRetailEntityType(company.entityType))
  const bySlug = new Map(retail.map((company) => [company.slug, company]))

  // Pinned slugs always come first, in the order defined above
  const pinned = PINNED_DIRECTORY_SLUGS.flatMap((slug) => {
    const company = bySlug.get(slug)
    return company ? [company] : []
  })
  const pinnedIds = new Set(pinned.map((company) => company.id))

  const rest = retail
    .filter((company) => !pinnedIds.has(company.id))
    .sort((a, b) => {
      // Primary: tier (sponsored → verified → unverified)
      const tierDiff = tier(a) - tier(b)
      if (tierDiff !== 0) return tierDiff
      // Secondary: CSV display_rank ascending (lower rank = higher prominence)
      const ra = (a as DirectoryCompany & { displayRank?: number }).displayRank ?? RANK_FALLBACK
      const rb = (b as DirectoryCompany & { displayRank?: number }).displayRank ?? RANK_FALLBACK
      if (ra !== rb) return ra - rb
      // Tertiary: editorial rating descending
      return (b.rating ?? 0) - (a.rating ?? 0)
    })

  return [...pinned, ...rest]
}

export async function getPublicDirectoryCompanies(): Promise<DirectoryCompany[]> {
  const rows = rowMap(await getPublicBrandRows())
  return editorialDirectory.map((company) => mergeDirectoryCompany(company, rows))
}

export async function getRankedPublicDirectory(): Promise<DirectoryCompany[]> {
  return rankPublicDirectory(await getPublicDirectoryCompanies())
}

export async function getPublicCompanyBySlug(slug: string): Promise<DirectoryCompany | undefined> {
  const companies = await getPublicDirectoryCompanies()
  return companies.find((company) => company.slug === slug.toLowerCase())
}

function directoryCompanyToBroker(company: DirectoryCompany): Broker {
  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    logoUrl: company.logoUrl,
    websiteUrl: company.websiteUrl,
    affiliateUrl: company.affiliateUrl || company.websiteUrl,
    category: company.category,
    shortDescription: company.shortDescription,
    rating: company.rating ?? 0,
    ratingLabel: company.ratingLabel,
    minDeposit: company.minDeposit || 'N/A',
    spreadsFrom: company.spreadsFrom || 'N/A',
    regulators: company.regulators || [],
    badges: company.badges || [],
    isFeatured: company.isFeatured,
    isSponsored: company.isSponsored,
    verificationStatus: company.verificationStatus,
  } as unknown as Broker
}

export async function getPublicBrokerCatalog(): Promise<Broker[]> {
  const rows = rowMap(await getPublicBrandRows())
  const directoryBySlug = new Map(
    editorialDirectory.map((company) => [company.slug, mergeDirectoryCompany(company, rows)]),
  )
  const catalog = editorialBrokers.map((broker) => {
    const merged = mergeBroker(broker, rows)
    const directoryCompany = directoryBySlug.get(broker.slug)
    return directoryCompany
      ? {
          ...merged,
          logoUrl: directoryCompany.logoUrl || merged.logoUrl,
          websiteUrl: directoryCompany.websiteUrl || merged.websiteUrl,
        }
      : merged
  })
  const catalogSlugs = new Set(catalog.map((broker) => broker.slug))
  const directoryOnly = PINNED_HOMEPAGE_SLUGS.flatMap((slug) => {
    const company = directoryBySlug.get(slug)
    return company && !catalogSlugs.has(slug) ? [directoryCompanyToBroker(company)] : []
  })
  return [...catalog, ...directoryOnly]
}

export async function getPublicBrokerBySlug(slug: string): Promise<Broker | undefined> {
  const catalog = await getPublicBrokerCatalog()
  return catalog.find((broker) => broker.slug === slug.toLowerCase())
}

/**
 * P2-251: Guard against placeholder/N-A core fields appearing on homepage widgets.
 * A broker is "widget-eligible" when it has a real (non-placeholder) description
 * and at least one non-N/A core field. Basic stubs (e.g. Dukascopy before enrichment)
 * are excluded until they receive editorial content.
 */
function isWidgetEligible(broker: Broker): boolean {
  const desc = broker.shortDescription ?? ''
  if (/details pending/i.test(desc)) return false
  const minDep = (broker as unknown as Record<string, unknown>).minDeposit as string | undefined
  const spreads = (broker as unknown as Record<string, unknown>).spreadsFrom as string | undefined
  // If both core display fields are N/A, don't surface on widgets
  if (minDep === 'N/A' && spreads === 'N/A') return false
  return true
}

export async function getPublicTopBrokers(count = 5): Promise<Broker[]> {
  const catalog = await getPublicBrokerCatalog()
  const bySlug = new Map(catalog.map((broker) => [broker.slug, broker]))
  const pinned = PINNED_HOMEPAGE_SLUGS.flatMap((slug) => {
    const broker = bySlug.get(slug)
    // P2-251: skip placeholder entries from the pinned list
    return broker && isWidgetEligible(broker) ? [broker] : []
  })
  const pinnedIds = new Set(pinned.map((broker) => broker.id))
  const rest = catalog
    .filter((broker) => !pinnedIds.has(broker.id) && isWidgetEligible(broker))
    .sort(
      (a, b) =>
        Number(b.isSponsored) - Number(a.isSponsored) ||
        Number(b.verificationStatus === 'verified') - Number(a.verificationStatus === 'verified') ||
        b.rating - a.rating,
    )
  return [...pinned, ...rest].slice(0, count)
}

export async function getPublicFeaturedBrokers(count = 2): Promise<Broker[]> {
  const catalog = await getPublicBrokerCatalog()
  const bySlug = new Map(catalog.map((broker) => [broker.slug, broker]))
  return ['saxo-bank', 'capital-com']
    .flatMap((slug) => {
      const broker = bySlug.get(slug)
      return broker ? [broker] : []
    })
    .slice(0, count)
}
