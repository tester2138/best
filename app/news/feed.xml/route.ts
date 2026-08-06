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

function rssDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date(0).toUTCString() : date.toUTCString()
}

export async function GET() {
  const posts = await getRssFeedPosts()
  const latestPublication = posts[0]?.publishedAt ?? new Date().toISOString()
  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/news/${post.slug}`
      const content = post.content || `<p>${escapeXml(post.excerpt)}</p>`
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rssDate(post.publishedAt)}</pubDate>
      <description>${cdata(post.excerpt)}</description>
      <content:encoded>${cdata(content)}</content:encoded>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${SITE_NAME} News</title>
    <link>${SITE_URL}/news</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${rssDate(latestPublication)}</lastBuildDate>
    <atom:link href="${NEWS_FEED_URL}" rel="self" type="application/rss+xml" />
    <atom:link href="${WEBSUB_HUB_URL}" rel="hub" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
