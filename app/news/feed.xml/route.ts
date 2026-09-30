import { getRssFeedPosts } from '@/lib/news-queries'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

export const NEWS_FEED_URL = `${SITE_URL}/news/feed.xml`
export const WEBSUB_HUB_URL = 'https://pubsubhubbub.appspot.com/'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`
}

function toDate(value?: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function latestDate(values: Array<string | undefined>): Date {
  const dates = values.map(toDate).filter((date): date is Date => Boolean(date))
  return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : new Date()
}

function rssDate(value: string | Date): string {
  const date = value instanceof Date ? value : toDate(value)
  return date ? date.toUTCString() : new Date(0).toUTCString()
}

function isoDate(value: string | undefined, fallback?: string): string {
  return (toDate(value) ?? toDate(fallback) ?? new Date(0)).toISOString()
}

export async function GET() {
  const posts = await getRssFeedPosts()
  const latestBuild = latestDate(
    posts.map((post) => post.updatedAt ?? post.publishedAt),
  )
  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/news/${post.slug}`
      const content = post.content || `<p>${escapeXml(post.excerpt)}</p>`
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${rssDate(post.publishedAt)}</pubDate>
      <dc:creator>${cdata(post.author.name)}</dc:creator>
      <category>${escapeXml(post.category)}</category>
      <dc:date>${isoDate(post.updatedAt, post.publishedAt)}</dc:date>
      <description>${cdata(post.excerpt)}</description>
      <content:encoded>${cdata(content)}</content:encoded>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)} News</title>
    <link>${escapeXml(`${SITE_URL}/news`)}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${rssDate(latestBuild)}</lastBuildDate>
    <atom:link href="${escapeXml(NEWS_FEED_URL)}" rel="self" type="application/rss+xml" />
    <atom:link href="${escapeXml(WEBSUB_HUB_URL)}" rel="hub" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
