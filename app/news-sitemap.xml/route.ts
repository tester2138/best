import { getNewsSitemapPosts } from '@/lib/news-queries'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

const NEWS_PUBLICATION_NAME = 'Best Forex News'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const posts = await getNewsSitemapPosts()
  const urls = posts
    .map(
      (post) => `  <url>
    <loc>${SITE_URL}/news/${escapeXml(post.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>${NEWS_PUBLICATION_NAME}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(post.publishedAt).toISOString()}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
    </news:news>
  </url>`,
    )
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
