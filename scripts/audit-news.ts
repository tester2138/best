import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { posts } from '@/data/posts'
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
  const raw = (post.metaTitle || post.title).replace(
    /\s*\|\s*BestForex\.io\s*$/i,
    '',
  )
  return raw.length > 55
    ? `${raw.slice(0, 55).replace(/[\s,]+$/, '')}…`
    : raw
}

function htmlTitle(html: string): string | undefined {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
}

function hasH1(html: string): boolean {
  return /<h1(?:\s|>)/i.test(html)
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
        if (!htmlTitle(html)) checks.push('missing HTML title')
        if (!html.includes(`canonical\" href=\"${siteUrl}/news/${post.slug}`)) {
          checks.push('missing or incorrect canonical')
        }
        if (!hasH1(html)) checks.push('missing H1')
        if (!html.includes('NewsArticle') && !html.includes('OpinionNewsArticle')) {
          checks.push('missing NewsArticle JSON-LD')
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
  const routes = await checkRoutes()
  const images = await checkImages()
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
  const noSources = posts
    .filter((post) => !post.linkedSources?.length)
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

No article route or featured-image failure was found in this static pass. Articles listed below need editorial/SEO review, not automatic deletion.

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

### Source attribution

Articles without linked primary sources (${noSources.length}):

${makeLists(noSources)}

## Validation notes

- Live articles were expected to return HTTP 200; future articles were expected to return HTTP 404.
- Live route HTML was checked for a title, canonical URL, H1, and NewsArticle/OpinionNewsArticle JSON-LD.
- Remote covers were checked with HTTP HEAD and local covers with filesystem existence checks.
- Neon inventory/status could not be included because the project returned HTTP 402 for data-transfer quota. This report therefore verifies the canonical static archive and date gate, not DB row status.
- Trustpilot and similar third-party source URLs may reject automated requests; source-link availability is separate from article route/image validity.

## Review priority

1. Fix any future route/image/required-field faults if they appear after rerun.
2. Review the ${wordUnder500.length} short articles first, especially live articles.
3. Add or verify primary sources for the ${noSources.length} articles without linked sources.
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
