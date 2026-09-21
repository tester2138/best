import { getNewsSitemapPosts } from '@/lib/news-queries'
import { SITE_NAME, SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

// Google requires this to match the publication name used on the article pages.
const NEWS_PUBLICATION_NAME = SITE_NAME

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function isoDate(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function latestIsoDate(...values: Array<string | undefined>): string | undefined {
  const dates = values.map(isoDate).filter((date): date is string => Boolean(date))
  return dates.length
    ? new Date(Math.max(...dates.map((date) => new Date(date).getTime()))).toISOString()
    : undefined
}

export async function GET() {
  const posts = await getNewsSitemapPosts()
  const urls = posts
    .map((post) => {
      const publicationDate = isoDate(post.publishedAt)
      if (!publicationDate) return null

      const lastModified = latestIsoDate(post.publishedAt, post.updatedAt) ?? publicationDate
      const articleUrl = `${SITE_URL}/news/${post.slug}`
      return `  <url>
    <loc>${escapeXml(articleUrl)}</loc>
    <lastmod>${lastModified}</lastmod>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(NEWS_PUBLICATION_NAME)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${publicationDate}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
    </news:news>
  </url>`
    })
    .filter((url): url is string => Boolean(url))
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls ? `\n${urls}\n` : '\n'}</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
