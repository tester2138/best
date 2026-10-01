import 'server-only'

import { unstable_cache } from 'next/cache'
import { brokers as editorialBrokers } from '@/data/brokers'
import { directoryCompanies } from '@/data/directory'
import { isRetailEntityType } from '@/lib/directory-types'
import { query } from '@/lib/portal/db'

export const DEFAULT_HOMEPAGE_FEATURED_BROKER_SLUGS = ['saxo-bank', 'capital-com'] as const
export const HOMEPAGE_FEATURED_BROKERS_CACHE_TAG = 'homepage-featured-brokers'

export type HomepageFeaturedBrokerOption = {
  slug: string
  name: string
  logoUrl?: string
  websiteUrl?: string
}

type HomepageFeaturedBrokerSlugs = [string, string]
type HomepageFeaturedBrokerRow = { slot: number; broker_slug: string }

const defaultSlugs = new Set<string>(DEFAULT_HOMEPAGE_FEATURED_BROKER_SLUGS)

function buildHomepageFeaturedBrokerOptions(): HomepageFeaturedBrokerOption[] {
  const optionsBySlug = new Map<string, HomepageFeaturedBrokerOption>()

  for (const company of directoryCompanies) {
    const slug = company.slug.toLowerCase()
    const isDefault = defaultSlugs.has(slug)
    if (!isDefault && !isRetailEntityType(company.entityType)) continue

    optionsBySlug.set(slug, {
      slug,
      name: company.name,
      logoUrl: company.logoUrl,
      websiteUrl: company.websiteUrl,
    })
  }

  for (const broker of editorialBrokers) {
    const slug = broker.slug.toLowerCase()
    optionsBySlug.set(slug, {
      slug,
      name: broker.name,
      logoUrl: broker.logoUrl,
      websiteUrl: broker.websiteUrl,
    })
  }

  return [...optionsBySlug.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug),
  )
}

const homepageFeaturedBrokerOptions = buildHomepageFeaturedBrokerOptions()
const homepageFeaturedBrokerSlugs = new Set(homepageFeaturedBrokerOptions.map(({ slug }) => slug))

export function getHomepageFeaturedBrokerOptions(): HomepageFeaturedBrokerOption[] {
  return homepageFeaturedBrokerOptions
}

export function isHomepageFeaturedBrokerSlug(slug: string): boolean {
  return homepageFeaturedBrokerSlugs.has(slug.trim().toLowerCase())
}

async function queryHomepageFeaturedBrokerSlugs(): Promise<HomepageFeaturedBrokerSlugs> {
  const rows = await query<HomepageFeaturedBrokerRow>(
    `select slot, broker_slug
       from public.homepage_featured_brokers
      order by slot asc`,
  )
  const bySlot = new Map(
    rows.map((row) => [Number(row.slot), row.broker_slug.trim().toLowerCase()] as const),
  )
  const first = bySlot.get(1)
  const second = bySlot.get(2)

  return [
    first && isHomepageFeaturedBrokerSlug(first)
      ? first
      : DEFAULT_HOMEPAGE_FEATURED_BROKER_SLUGS[0],
    second && isHomepageFeaturedBrokerSlug(second)
      ? second
      : DEFAULT_HOMEPAGE_FEATURED_BROKER_SLUGS[1],
  ]
}

const getCachedHomepageFeaturedBrokerSlugs = unstable_cache(
  queryHomepageFeaturedBrokerSlugs,
  ['homepage-featured-brokers-v1'],
  { tags: [HOMEPAGE_FEATURED_BROKERS_CACHE_TAG], revalidate: 300 },
)

let fallbackWarningLogged = false

export async function getHomepageFeaturedBrokerSlugs(): Promise<HomepageFeaturedBrokerSlugs> {
  try {
    const slugs = await getCachedHomepageFeaturedBrokerSlugs()
    fallbackWarningLogged = false
    return slugs
  } catch (error) {
    if (!fallbackWarningLogged) {
      console.warn('[homepage-featured-brokers] Selection unavailable; using the default pair.', error)
      fallbackWarningLogged = true
    }
    return [...DEFAULT_HOMEPAGE_FEATURED_BROKER_SLUGS]
  }
}
