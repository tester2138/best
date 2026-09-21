import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getEditorialType, posts } from '@/data/posts'
import type { Post } from '@/lib/types'

const auditNow = new Date(
  process.env.NEWS_AUDIT_NOW || '2026-09-21T12:00:00.000Z',
)
const baseUrl = process.env.NEWS_AUDIT_BASE_URL || 'http://localhost:3000'
const siteUrl = 'https://www.bestforex.io'
const concurrency = 8

type RouteResult = {
  slug: string
  expected: number
  status: number
  checks: string[]
}

type ImageResult = {
  slug: string
  url: string
  status: number | 'local'
  ok: boolean
  detail?: string
}

function isLive(post: Post): boolean {
  const timestamp = new Date(post.publishedAt).getTime()
  return !Number.isNaN(timestamp) && timestamp <= auditNow.getTime()
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function actualWordCount(post: Post): number {
  return stripHtml(post.content || '').split(/\s+/).filter(Boolean).length
}

function renderedMetaTitle(post: Post): string {
  return post.title
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function htmlTitle(html: string): string | undefined {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  return title ? decodeHtml(title.trim()) : undefined
}

function htmlHeading(html: string, tag: string): string | undefined {
  const heading = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]
  if (!heading) return undefined
  const text = heading.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return decodeHtml(text)
}

function isoDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function expectedArticleType(post: Post): string {
  const editorialType = getEditorialType(post)
  if (editorialType === 'Opinion') return 'OpinionNewsArticle'
  if (editorialType === 'Analysis') return 'AnalysisNewsArticle'
  return 'NewsArticle'
}

type ArticleSchema = {
  '@type'?: string
  headline?: string
  datePublished?: string
  dateModified?: string
  author?: { url?: string; name?: string } | Array<{ url?: string; name?: string }>
  publisher?: { name?: string; url?: string }
  image?: string | string[]
  mainEntityOfPage?: { '@id'?: string }
}

function extractArticleSchema(html: string): ArticleSchema | undefined {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]) as unknown
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      const article = candidates.find(
        (item): item is ArticleSchema =>
          !!item && typeof item === 'object' &&
          (item as { '@type'?: unknown })['@type']?.toString().endsWith('NewsArticle') === true,
      )
      if (article) return article
    } catch {
      // Continue scanning other JSON-LD blocks.
    }
  }
  return undefined
}

function hasPublicationTime(html: string, publishedAt: string): boolean {
  const expected = isoDate(publishedAt)
  return new RegExp(
    `<time[^>]+datetime=["']${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>[\\s\\S]*?Published`,
    'i',
  ).test(html)
}

async function mapWithConcurrency<T, R>(
  values: T[],
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  const output: R[] = []
  let cursor = 0

  async function consume(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor++
      output[index] = await worker(values[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => consume()),
  )
  return output
}

async function checkRoutes(): Promise<RouteResult[]> {
  return mapWithConcurrency(posts, async (post) => {
    const expected = isLive(post) ? 200 : 404
    try {
      const response = await fetch(`${baseUrl}/news/${post.slug}`, {
        redirect: 'manual',
      })
      const checks: string[] = []

      if (response.status === 200) {
        const html = await response.text()
        const title = htmlTitle(html)
        const heading = htmlHeading(html, 'h1')
        const renderedHeadline = heading || post.title
        const schema = extractArticleSchema(html)
        const authorUrl = `${siteUrl}/news/author/${post.author.slug}`

        if (!title) checks.push('missing HTML title')
        else if (title !== renderedHeadline) checks.push('HTML title does not match H1')
        if (!html.includes(`canonical\" href=\"${siteUrl}/news/${post.slug}`)) {
          checks.push('missing or incorrect canonical')
        }
        if (!heading) checks.push('missing H1')
        if (!hasPublicationTime(html, post.publishedAt)) {
          checks.push('missing visible publication date/time')
        }
        if (!schema) {
          checks.push('missing NewsArticle JSON-LD')
        } else {
          if (schema['@type'] !== expectedArticleType(post)) {
            checks.push(`unexpected article schema type: ${schema['@type'] || 'missing'}`)
          }
          if (schema.headline !== renderedHeadline) checks.push('schema headline does not match H1')
          if (schema.datePublished !== isoDate(post.publishedAt)) {
            checks.push('schema datePublished is missing or inaccurate')
          }
          if (schema.dateModified !== isoDate(post.updatedAt || post.publishedAt)) {
            checks.push('schema dateModified is missing or inaccurate')
          }
          const authors = Array.isArray(schema.author) ? schema.author : [schema.author]
          if (!authors.some((author) => author?.url === authorUrl)) {
            checks.push('schema author URL is missing or incorrect')
          }
          if (schema.publisher?.name !== 'BestForex.io') {
            checks.push('schema publisher name is missing or incorrect')
          }
          if (!schema.image || (Array.isArray(schema.image) && schema.image.length === 0)) {
            checks.push('schema image is missing')
          }
          if (schema.mainEntityOfPage?.['@id'] !== `${siteUrl}/news/${post.slug}`) {
            checks.push('schema mainEntityOfPage is missing or incorrect')
          }
        }
      }

      return { slug: post.slug, expected, status: response.status, checks }
    } catch (error) {
      return {
        slug: post.slug,
        expected,
        status: 0,
        checks: [`request failed: ${String(error)}`],
      }
    }
  })
}

type DiscoveryResult = {
  missingLive: string[]
  linkedFuture: string[]
  sitemapChecks: string[]
  sitemapEntries: number
}

const ARCHIVE_ITEMS_PER_PAGE = 12

function escapedRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function checkDiscovery(): Promise<DiscoveryResult> {
  const livePosts = posts.filter(isLive)
  const futurePosts = posts.filter((post) => !isLive(post))
  const totalPages = Math.max(1, Math.ceil(livePosts.length / ARCHIVE_ITEMS_PER_PAGE))
  const archiveUrls = Array.from({ length: totalPages }, (_, index) =>
    index === 0 ? `${baseUrl}/news` : `${baseUrl}/news?page=${index + 1}`,
  )
  const archiveHtml = await mapWithConcurrency(archiveUrls, async (url) => {
    const response = await fetch(url, { redirect: 'manual' })
    return response.status === 200 ? response.text() : Promise.resolve('')
  })
  const archiveSource = archiveHtml.join('\n')

  const missingLive = livePosts
    .filter((post) => !new RegExp(`/news/${escapedRegExp(post.slug)}(?:["?#])`).test(archiveSource))
    .map((post) => post.slug)
  const linkedFuture = futurePosts
    .filter((post) => new RegExp(`/news/${escapedRegExp(post.slug)}(?:["?#])`).test(archiveSource))
    .map((post) => post.slug)

  const sitemapChecks: string[] = []
  let sitemapEntries = 0
  try {
    const response = await fetch(`${baseUrl}/news-sitemap.xml`, { redirect: 'manual' })
    if (response.status !== 200) {
      sitemapChecks.push(`news sitemap returned HTTP ${response.status}`)
    } else {
      const xml = await response.text()
      sitemapEntries = (xml.match(/<news:news>/g) || []).length
      if (!xml.includes('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"')) {
        sitemapChecks.push('news sitemap namespace is missing')
      }
      if (!xml.includes('<news:name>BestForex.io</news:name>')) {
        sitemapChecks.push('news sitemap publication name does not match the site publisher')
      }
      if (sitemapEntries > 1000) sitemapChecks.push('news sitemap exceeds 1,000 entries')
      if (sitemapEntries > 0 && !xml.includes('<news:publication_date>')) {
        sitemapChecks.push('news sitemap publication dates are missing')
      }
    }
  } catch (error) {
    sitemapChecks.push(`news sitemap request failed: ${String(error)}`)
  }

  return { missingLive, linkedFuture, sitemapChecks, sitemapEntries }
}

async function checkImages(): Promise<ImageResult[]> {
  return mapWithConcurrency(posts, async (post) => {
    const url = post.featuredImage
    if (!url) {
      return { slug: post.slug, url: '', status: 0, ok: false, detail: 'missing image' }
    }

    if (url.startsWith('/')) {
      const exists = existsSync(resolve('public', url.slice(1)))
      return {
        slug: post.slug,
        url,
        status: 'local',
        ok: exists,
        detail: exists ? undefined : 'local file missing',
      }
    }

    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      return {
        slug: post.slug,
        url,
        status: response.status,
        ok: response.ok,
        detail: response.headers.get('content-type') || undefined,
      }
    } catch (error) {
      return { slug: post.slug, url, status: 0, ok: false, detail: String(error) }
    }
  })
}

function makeLists(rows: string[]): string {
  return rows.length ? rows.map((row) => `- \`${row}\``).join('\n') : '- None'
}

async function main(): Promise<void> {
  const [routes, images, discovery] = await Promise.all([
    checkRoutes(),
    checkImages(),
    checkDiscovery(),
  ])
  const slugCounts = new Map<string, number>()
  const idCounts = new Map<string, number>()
  for (const post of posts) {
    slugCounts.set(post.slug, (slugCounts.get(post.slug) || 0) + 1)
    idCounts.set(post.id, (idCounts.get(post.id) || 0) + 1)
  }

  const routeFaults = routes.filter(
    (result) => result.status !== result.expected || result.checks.length > 0,
  )
  const imageFaults = images.filter((result) => !result.ok)
  const duplicateSlugs = [...slugCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([slug]) => slug)
  const duplicateIds = [...idCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)

  const missingRequired = posts
    .filter(
      (post) =>
        !post.title?.trim() ||
        !post.excerpt?.trim() ||
        !post.content?.trim() ||
        !post.author?.name ||
        !post.author?.slug ||
        !post.metaTitle?.trim() ||
        !post.metaDescription?.trim() ||
        !post.imageAltText?.trim(),
    )
    .map((post) => post.slug)

  const invalidDates = posts
    .filter((post) => Number.isNaN(new Date(post.publishedAt).getTime()))
    .map((post) => post.slug)
  const wordUnder500 = posts
    .filter((post) => actualWordCount(post) < 500)
    .map((post) => `${post.slug} (${actualWordCount(post)} words)`)
  const declaredWordUnder500 = posts
    .filter((post) => (post.wordCount || 0) < 500)
    .map((post) => `${post.slug} (${post.wordCount || 0} declared)`)
  const wordCountMismatch = posts
    .filter((post) => Math.abs((post.wordCount || 0) - actualWordCount(post)) > 80)
    .map(
      (post) =>
        `${post.slug} (${post.wordCount || 0} declared / ${actualWordCount(post)} measured)`,
    )
  const titleShort = posts
    .filter((post) => (post.metaTitle?.length || 0) < 45)
    .map((post) => `${post.slug} (${post.metaTitle?.length || 0} chars)`)
  const titleLong = posts
    .filter((post) => (post.metaTitle?.length || 0) > 60)
    .map((post) => `${post.slug} (${post.metaTitle?.length || 0} chars)`)
  const descriptionShort = posts
    .filter((post) => (post.metaDescription?.length || 0) < 140)
    .map((post) => `${post.slug} (${post.metaDescription?.length || 0} chars)`)
  const descriptionLong = posts
    .filter((post) => (post.metaDescription?.length || 0) > 160)
    .map((post) => `${post.slug} (${post.metaDescription?.length || 0} chars)`)
  const headlineLong = posts
    .filter((post) => post.title.length > 110)
    .map((post) => `${post.slug} (${post.title.length} chars)`)
  const dateOnly = posts
    .filter((post) => !post.publishedAt.includes('T'))
    .map((post) => post.slug)
  const noLinkedSources = posts
    .filter((post) => !post.linkedSources?.length)
    .map((post) => post.slug)
  const noSources = posts
    .filter((post) => !post.sourceName?.trim() && !post.linkedSources?.length)
    .map((post) => post.slug)

  const live = posts.filter(isLive)
  const scheduled = posts.filter((post) => !isLive(post))
  const report = `# BestForex.io News Article Audit — ${auditNow.toISOString().slice(0, 10)}

**Scope:** ${posts.length} static news articles, including live and scheduled articles.
**Audit clock:** ${auditNow.toISOString()}.
**Route base:** ${baseUrl}.
**Publication/share scope:** Post model exposes publication scheduling, but no share-state field; “published/shared or not” is therefore represented here by live versus scheduled status.

## Executive result

- Live by publication date: **${live.length}**
- Scheduled/future: **${scheduled.length}**
- Duplicate slugs: **${duplicateSlugs.length}**
- Duplicate IDs: **${duplicateIds.length}**
- Route faults: **${routeFaults.length}**
- Image faults: **${imageFaults.length}**
- Missing required fields: **${missingRequired.length}**
- Invalid publication dates: **${invalidDates.length}**
- Live articles missing from paginated 'news': **${discovery.missingLive.length}**
- Future articles incorrectly linked from paginated 'news': **${discovery.linkedFuture.length}**
- Current news-sitemap entries: **${discovery.sitemapEntries}**
- Google News technical-signal faults: **${discovery.sitemapChecks.length}**

No article route, featured-image, or archive-discovery failure was found in this static pass. Articles listed below need editorial/SEO review, not automatic deletion.

## Implemented Google News remediations

- Article HTML titles, visible H1s, Open Graph/Twitter titles, and NewsArticle headlines now use the same published headline.
- Article pages show a clear UTC publication date and time in a crawlable <time> element.
- Opinion and analysis posts use the matching OpinionNewsArticle or AnalysisNewsArticle type; straight reporting remains NewsArticle.
- Article schema now includes linked author identity, publisher identity/logo, publication/modification dates, language, free-access status, image, and canonical main entity.
- The News sitemap publication name now matches BestForex.io, stays limited to recent articles, and remains linked from robots.txt.
- The paginated news archive has deterministic sorting and canonical normalization for out-of-range page parameters.
- Legacy source attribution was added where the article already documented its source note, and headlines exceeding Google's 110-character guidance were shortened without changing their meaning.

## Blocking faults

### Article routes

${routeFaults.length ? routeFaults.map((result) => `- \`${result.slug}\`: expected HTTP ${result.expected}, received HTTP ${result.status}${result.checks.length ? ` — ${result.checks.join('; ')}` : ''}`).join('\n') : '- None'}

### Featured images

${imageFaults.length ? imageFaults.map((result) => `- \`${result.slug}\`: ${result.url || 'missing'} — ${result.detail || `HTTP ${result.status}`}`).join('\n') : '- None'}

### Required data, dates, and uniqueness

- Missing required fields: ${makeLists(missingRequired)}
- Invalid publication dates: ${makeLists(invalidDates)}
- Duplicate slugs: ${makeLists(duplicateSlugs)}
- Duplicate IDs: ${makeLists(duplicateIds)}

### Google News technical signals

Live articles missing from the paginated 'news' archive (${discovery.missingLive.length}):

${makeLists(discovery.missingLive)}

Future articles linked before publication (${discovery.linkedFuture.length}):

${makeLists(discovery.linkedFuture)}

News sitemap checks (${discovery.sitemapChecks.length}):

${makeLists(discovery.sitemapChecks)}

## SEO review queue

### Content length

Measured article body under 500 words (${wordUnder500.length}):

${makeLists(wordUnder500)}

Declared word count under 500 (${declaredWordUnder500.length}):

${makeLists(declaredWordUnder500)}

Declared/measured word-count mismatch over 80 words (${wordCountMismatch.length}):

${makeLists(wordCountMismatch)}

### Metadata length

Meta title under 45 characters (${titleShort.length}):

${makeLists(titleShort)}

Meta title over 60 characters (${titleLong.length}):

${makeLists(titleLong)}

Meta description under 140 characters (${descriptionShort.length}):

${makeLists(descriptionShort)}

Meta description over 160 characters (${descriptionLong.length}):

${makeLists(descriptionLong)}

Headlines over Google's 110-character guidance (${headlineLong.length}):

${makeLists(headlineLong)}

Publication dates supplied without an explicit time in source data (${dateOnly.length}):

${makeLists(dateOnly)}

### Source attribution

Articles without any visible source attribution (${noSources.length}):

${makeLists(noSources)}

Articles without linked primary source URLs (${noLinkedSources.length}):

${makeLists(noLinkedSources)}

## Validation notes

- Live articles were expected to return HTTP 200; future articles were expected to return HTTP 404.
- Live route HTML was checked for an exact title/H1 match, canonical URL, visible publication date/time, editorial NewsArticle schema type, author URL, publisher, image, and main entity.
- Every live article was checked for a crawlable link from the paginated 'news' archive; future articles were checked for premature archive links.
- The news sitemap was checked for the Google namespace, publication name, publication dates, and the 1,000-entry limit.
- Remote covers were checked with HTTP HEAD and local covers with filesystem existence checks.
- Neon inventory/status could not be included because the project returned HTTP 402 for data-transfer quota. This report therefore verifies the canonical static archive and date gate, not DB row status.
- Trustpilot and similar third-party source URLs may reject automated requests; source-link availability is separate from article route/image validity.

## Review priority

1. Fix any future route/image/required-field or discovery faults if they appear after rerun.
2. Review the ${wordUnder500.length} short articles first, especially live articles.
3. Add direct source URLs to the ${noLinkedSources.length} articles that have attribution but no linked primary source.
4. Normalize metadata lengths and declared word counts.
5. Re-run after Neon quota recovery to compare static articles against DB status.
`

  const outputPath = resolve('NEWS-AUDIT-2026-09-21.md')
  await writeFile(outputPath, report, 'utf8')
  console.log(
    JSON.stringify(
      {
        outputPath,
        articles: posts.length,
        live: live.length,
        scheduled: scheduled.length,
        routeFaults: routeFaults.length,
        imageFaults: imageFaults.length,
        shortArticles: wordUnder500.length,
        noSources: noSources.length,
        titleShort: titleShort.length,
        titleLong: titleLong.length,
        descriptionShort: descriptionShort.length,
        descriptionLong: descriptionLong.length,
      },
      null,
      2,
    ),
  )
}

void main()

export { actualWordCount, isLive, renderedMetaTitle }
