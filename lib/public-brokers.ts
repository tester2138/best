import 'server-only'

import { unstable_cache } from 'next/cache'
import { brokers as editorialBrokers } from '@/data/brokers'
import { directoryCompanies as editorialDirectory } from '@/data/directory'
import { query } from '@/lib/portal/db'
import { applyOverrides } from '@/lib/admin-overrides'
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

const getCachedPublicBrandRows = unstable_cache(queryPublicBrandRows, ['public-broker-overlay-v4'], {
  tags: ['broker-directory'],
  revalidate: 300,
})

interface AdminOverrideRow {
  slug: string
  overrides: Record<string, unknown>
}

async function queryAdminOverrides(): Promise<AdminOverrideRow[]> {
  return query<AdminOverrideRow>(`select slug, overrides from public.admin_profile_overrides`)
}

const getCachedAdminOverrides = unstable_cache(queryAdminOverrides, ['admin-profile-overrides-v1'], {
  tags: ['broker-directory'],
  revalidate: 300,
})

const QUOTA_RETRY_COOLDOWN_MS = 5 * 60 * 1000
let quotaRetryAfter = 0

/**
 * Combined overlay: brands-row placement/verification data plus admin profile
 * overrides, both keyed by slug. A transient Neon failure must never be
 * persisted as an empty overlay and replace the canonical master ranking, so
 * the catch lives outside unstable_cache.
 */
async function getOverlayData(): Promise<{
  rows: Map<string, PublicBrandRow>
  overrides: Map<string, Record<string, unknown>>
}> {
  if (Date.now() < quotaRetryAfter) return { rows: new Map(), overrides: new Map() }

  try {
    const [rows, overrideRows] = await Promise.all([
      getCachedPublicBrandRows(),
      getCachedAdminOverrides(),
    ])
    return {
      rows: rowMap(rows),
      overrides: new Map(overrideRows.map((r) => [r.slug.toLowerCase(), r.overrides])),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('402') || message.toLowerCase().includes('quota')) {
      quotaRetryAfter = Date.now() + QUOTA_RETRY_COOLDOWN_MS
      console.warn(
        `[public-brokers] Neon quota exceeded; serving static directory and retrying after ${QUOTA_RETRY_COOLDOWN_MS / 1000}s — ${message}`,
      )
    } else {
      console.error(
        `[public-brokers] brand overlay unavailable, serving static directory — ${message}`,
      )
    }
    return { rows: new Map(), overrides: new Map() }
  }
}

function statusFromRow(
  row: PublicBrandRow | undefined,
  fallback: VerificationStatus,
): VerificationStatus {
  // A present DB row is authoritative. When the overlay is unavailable, keep
  // the reviewed status shipped in the editorial catalogue rather than
  // silently demoting every brand to unverified.
  if (row) {
    return row.verification_status === 'verified' ? 'verified' : 'unverified'
  }
  return fallback
}

function rowMap(rows: PublicBrandRow[]): Map<string, PublicBrandRow> {
  return new Map(rows.map((row) => [row.slug.toLowerCase(), row]))
}

function mergeDirectoryCompany(
  company: DirectoryCompany,
  rows: Map<string, PublicBrandRow>,
  overrides?: Map<string, Record<string, unknown>>,
): DirectoryCompany {
  const row = rows.get(company.slug.toLowerCase())
  const merged: DirectoryCompany = {
    ...company,
    verificationStatus: statusFromRow(row, company.verificationStatus),
    isSponsored: row?.is_sponsored ?? company.isSponsored,
    isFeatured: row?.is_featured ?? company.isFeatured,
    websiteUrl: row?.website || company.websiteUrl,
    logoUrl: row?.logo_url || company.logoUrl,
    displayRank: row?.display_rank ?? undefined,
    // Apply the canonical CSV score; fall back to editorial rating if not seeded
    rating: row?.rating_score != null ? Number(row.rating_score) : company.rating,
    isDuplicate: row?.is_duplicate ?? false, // DB flag; no entries are currently duplicated
  }
  // Admin profile overrides win over catalog + brands-row content fields.
  return overrides ? applyOverrides(merged, overrides.get(company.slug.toLowerCase())) : merged
}

function mergeBroker(
  broker: Broker,
  rows: Map<string, PublicBrandRow>,
  overrides?: Map<string, Record<string, unknown>>,
): Broker {
  const row = rows.get(broker.slug.toLowerCase())
  const merged: Broker = {
    ...broker,
    verificationStatus: statusFromRow(row, broker.verificationStatus ?? 'unverified'),
    isSponsored: row?.is_sponsored ?? broker.isSponsored,
    isFeatured: row?.is_featured ?? broker.isFeatured,
    websiteUrl: row?.website || broker.websiteUrl,
    logoUrl: row?.logo_url || broker.logoUrl,
    // Apply the canonical CSV score to the broker rating
    rating: row?.rating_score != null ? Number(row.rating_score) : broker.rating,
  }
  return overrides ? applyOverrides(merged, overrides.get(broker.slug.toLowerCase())) : merged
}

function tier(company: Pick<DirectoryCompany, 'isSponsored' | 'verificationStatus'>): number {
  if (company.isSponsored) return 0
  if (company.verificationStatus === 'verified') return 1
  return 2
}

/** Fallback rank for items without a DB display_rank: place at end */
const RANK_FALLBACK = 999999

function compareStableIdentity(a: DirectoryCompany, b: DirectoryCompany): number {
  if (a.slug !== b.slug) return a.slug < b.slug ? -1 : 1
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

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
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0)
      if (ratingDiff !== 0) return ratingDiff
      // Final: total deterministic order for ties and fallback data
      return compareStableIdentity(a, b)
    })

  return [...pinned, ...rest]
}

export async function getPublicDirectoryCompanies(): Promise<DirectoryCompany[]> {
  const { rows, overrides } = await getOverlayData()
  return editorialDirectory.map((company) => mergeDirectoryCompany(company, rows, overrides))
}

export async function getRankedPublicDirectory(): Promise<DirectoryCompany[]> {
  return rankPublicDirectory(await getPublicDirectoryCompanies())
}

export async function getPublicCompanyBySlug(slug: string): Promise<DirectoryCompany | undefined> {
  const companies = await getPublicDirectoryCompanies()
  return companies.find((company) => company.slug === slug.toLowerCase())
}

/** Public catalog plus brands-row data, without admin overrides, for editor diffs. */
export async function getPublicCompanyBaseBySlug(
  slug: string,
): Promise<DirectoryCompany | undefined> {
  const normalizedSlug = slug.toLowerCase()
  const company = editorialDirectory.find((entry) => entry.slug === normalizedSlug)
  if (!company) return undefined
  const { rows } = await getOverlayData()
  return mergeDirectoryCompany(company, rows)
}

export function directoryCompanyToBroker(company: DirectoryCompany): Broker {
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
  const { rows, overrides } = await getOverlayData()
  const directoryBySlug = new Map(
    editorialDirectory.map((company) => [
      company.slug,
      mergeDirectoryCompany(company, rows, overrides),
    ]),
  )
  const catalog = editorialBrokers.map((broker) => {
    const merged = mergeBroker(broker, rows, overrides)
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

/** Public catalog plus brands-row data, without admin overrides, for editor diffs. */
export async function getPublicBrokerBaseBySlug(slug: string): Promise<Broker | undefined> {
  const normalizedSlug = slug.toLowerCase()
  const broker = editorialBrokers.find((entry) => entry.slug === normalizedSlug)
  if (!broker) return undefined
  const { rows } = await getOverlayData()
  return mergeBroker(broker, rows)
}

export async function getPublicAdminProfileOverridesBySlug(
  slug: string,
): Promise<Record<string, unknown>> {
  const { overrides } = await getOverlayData()
  return overrides.get(slug.toLowerCase()) ?? {}
}

/**
 * Legacy root-level URLs (/Plus500, /plus-500, /Plus%20500) must redirect to
 * /brokers/{slug} for EVERY brand that has a live profile page. The profile
 * route resolves a slug through the full directory catalogue (directory.ts)
 * OR the legacy broker catalogue (brokers.ts), so this resolver must match
 * that exact set — the ~1,700 directory-only brands included.
 *
 * Static sources are checked first with zero DB dependency: a pure redirect
 * must never fail because of a Neon outage (the DB-backed catalog below is
 * already error-safe, but we avoid touching it entirely for known slugs).
 */
const STATIC_PROFILE_SLUGS = new Set<string>([
  ...editorialDirectory.map((company) => company.slug.toLowerCase()),
  ...editorialBrokers.map((broker) => broker.slug.toLowerCase()),
])

export function normalizeLegacyBrokerSlug(rawSlug: string): string {
  let slug = rawSlug.trim()
  // Path params may still be percent-encoded (e.g. /Plus%20500). decodeURI can
  // throw on malformed input, so fall back to the raw segment.
  if (slug.includes('%')) {
    try {
      slug = decodeURIComponent(slug)
    } catch {
      // keep the raw segment
    }
  }
  return slug.toLowerCase().replace(/^-+|-+$/g, '')
}

/**
 * Candidate normalisations for a legacy slug, most-canonical first:
 * 1. as-typed lowercase            → /plus500
 * 2. whitespace/hyphens collapsed  → /saxo-bank, /saxo  bank
 * 3. separators removed entirely   → /Plus 500, /plus--500 → plus500
 */
function legacySlugCandidates(rawSlug: string): string[] {
  const base = normalizeLegacyBrokerSlug(rawSlug)
  if (!base) return []
  const collapsed = base.replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, '')
  const stripped = base.replace(/[\s-]+/g, '')
  return [...new Set([base, collapsed, stripped].filter(Boolean))]
}

export async function resolveLegacyBrokerSlug(rawSlug: string): Promise<string | undefined> {
  const candidates = legacySlugCandidates(rawSlug)
  if (candidates.length === 0) return undefined

  // Static sources first with zero DB dependency: a pure redirect must never
  // fail because of a Neon outage.
  for (const slug of candidates) {
    if (STATIC_PROFILE_SLUGS.has(slug)) return slug
  }

  // Not in the editorial catalogues. Fall back to the DB-backed catalog
  // (covers pinned directory-only entries); it resolves undefined on DB
  // failure rather than throwing, so unknown/offline slugs 404 cleanly.
  for (const slug of candidates) {
    const broker = await getPublicBrokerBySlug(slug)
    if (broker) return slug
  }
  return undefined
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
