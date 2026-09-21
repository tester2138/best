import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { directoryCompanies, rankedBrokers } from '@/data/directory'
import { getVisiblePosts, getPublishedAuthors } from '@/data/posts'
import { isIndexableBroker } from '@/lib/seo'

// Scheduling: re-generate frequently so a staged article's URL enters the
// sitemap soon after it is live (never advertise a URL that still 404s).
export const revalidate = 300

// T10: /brokers pagination — each page is a distinct, indexable URL with its
// own self-canonical. Page 1 = /brokers (no ?page=1 param). Pages 2..N carry
// ?page=N self-canonicals. ITEMS_PER_PAGE must match the brokers directory page.
// P2-229: use rankedBrokers.length (retail entities only) so sitemap page count
// matches the rendered pagination — eliminates orphan sitemap entries beyond the
// last rendered page.
const ITEMS_PER_PAGE = 20
const TOTAL_PAGES = Math.ceil(rankedBrokers.length / ITEMS_PER_PAGE)

/**
 * Dynamic XML sitemap. Enumerates every indexable URL on the canonical host:
 * static hub/marketing pages, quality broker profiles (enriched+), and all
 * published news articles. Thin `basic` broker stubs are intentionally excluded
 * (they are served noindex) to keep the index high-quality.
 *
 * Next.js serves this at /sitemap.xml. A single file supports up to 50,000 URLs,
 * which comfortably covers the current catalogue.
 */
// Fixed last-meaningful-edit date for static marketing/legal pages. Bump only
// when those pages actually change — avoids a false "updated every crawl" signal.
const STATIC_PAGE_DATE = new Date('2026-06-27')

function toDate(value?: string): Date | undefined {
  return value ? new Date(value) : undefined
}

function maxDate(dates: Array<Date | undefined>, fallback: Date): Date {
  const valid = dates.filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
  return valid.length ? new Date(Math.max(...valid.map((d) => d.getTime()))) : fallback
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Derive real freshness from the data itself, not the crawl time.
  const latestBrokerDate = maxDate(
    directoryCompanies.map((c) => toDate(c.lastVerifiedAt)),
    STATIC_PAGE_DATE
  )
  const visiblePosts = await getVisiblePosts()
  const latestPostDate = maxDate(
    visiblePosts.map((p) => toDate(p.updatedAt) ?? toDate(p.publishedAt)),
    STATIC_PAGE_DATE
  )

  // Static, indexable routes (utility/legal pages get lower priority).
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: latestBrokerDate, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/brokers`, lastModified: latestBrokerDate, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/brokers/all`, lastModified: latestBrokerDate, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/news`, lastModified: latestPostDate, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/offers`, lastModified: latestBrokerDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/compare`, lastModified: latestBrokerDate, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/media-kit`, lastModified: STATIC_PAGE_DATE, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/methodology`, lastModified: STATIC_PAGE_DATE, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/about`, lastModified: STATIC_PAGE_DATE, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/editorial-policy`, lastModified: STATIC_PAGE_DATE, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/corrections`, lastModified: STATIC_PAGE_DATE, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/contact-us`, lastModified: STATIC_PAGE_DATE, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: STATIC_PAGE_DATE, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: STATIC_PAGE_DATE, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/disclaimer`, lastModified: STATIC_PAGE_DATE, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // /brokers pagination — page 1 is already in staticRoutes as /brokers.
  // Pages 2..TOTAL_PAGES carry ?page=N self-canonicals (G2 protected).
  const paginationRoutes: MetadataRoute.Sitemap = Array.from(
    { length: TOTAL_PAGES - 1 },
    (_, i) => ({
      url: `${SITE_URL}/brokers?page=${i + 2}`,
      lastModified: latestBrokerDate,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })
  )

  // Quality broker profiles only (enriched stage or better).
  // Uses isIndexableBroker — exact complement of the noindex branch in the
  // profile generateMetadata. Keeps sitemap and robots meta in sync.
  const brokerRoutes: MetadataRoute.Sitemap = directoryCompanies
    .filter(isIndexableBroker)
    .map((company) => ({
      url: `${SITE_URL}/brokers/${company.slug}`,
      lastModified: toDate(company.lastVerifiedAt) ?? STATIC_PAGE_DATE,
      changeFrequency: 'weekly',
      priority: company.dataQualityStage === 'reviewed' || company.dataQualityStage === 'featured' ? 0.8 : 0.6,
    }))

  // Published news articles (scheduled/future-dated posts are excluded).
  const newsRoutes: MetadataRoute.Sitemap = visiblePosts.map((post) => ({
    url: `${SITE_URL}/news/${post.slug}`,
    lastModified: toDate(post.updatedAt) ?? toDate(post.publishedAt) ?? STATIC_PAGE_DATE,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // News category archives — T10: include only when T28 makes them indexable.
  // Until T28 runs, category pages self-canonical to /news so must NOT appear
  // in the sitemap as separate URLs.
  // TODO T28: re-enable when categories have unique intro copy and self-canonicals.
  // const categoryRoutes: MetadataRoute.Sitemap = ...

  // Author pages — E-E-A-T entity pages for published authors only.
  // Consolidated under /news/author so they live in the Google News namespace.
  const publishedAuthors = await getPublishedAuthors()
  const authorRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/news/author`, lastModified: latestPostDate, changeFrequency: 'monthly', priority: 0.4 },
    ...publishedAuthors.map((author) => ({
      url: `${SITE_URL}/news/author/${author.slug}`,
      lastModified: latestPostDate,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ]

  return [...staticRoutes, ...paginationRoutes, ...brokerRoutes, ...newsRoutes, ...authorRoutes]
}
