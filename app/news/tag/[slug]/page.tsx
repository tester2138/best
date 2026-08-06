import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { getPostsByTag, getAllTags, tagToSlug } from '@/data/posts'
import { formatDate } from '@/lib/utils'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

// Scheduling: re-render hourly so scheduled posts join their tag hubs on their
// publish date. getPostsByTag / getAllTags only return published posts.
export const revalidate = 3600

// Guard C: minimum article count before a tag hub is indexed.
const NOINDEX_THRESHOLD = 3

interface TagPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return (await getAllTags()).map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params
  const allTagsMeta = await getAllTags()
  const tagMeta = allTagsMeta.find(t => t.slug === slug)
  if (!tagMeta) return { title: 'Tag Not Found' }

  const tagPosts = await getPostsByTag(slug)
  const indexable = tagPosts.length >= NOINDEX_THRESHOLD
  const label = tagMeta.label

  return {
    title: `${label} — Forex News & Analysis`,
    description: `Browse ${tagPosts.length} article${tagPosts.length === 1 ? '' : 's'} tagged "${label}" on BestForex.io.`,
    alternates: indexable ? { canonical: `${SITE_URL}/news/tag/${slug}` } : undefined,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: `${label} — ${SITE_NAME}`,
      type: 'website',
      url: `${SITE_URL}/news/tag/${slug}`,
      siteName: SITE_NAME,
    },
  }
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params
  const allTags = await getAllTags()
  const tagMeta = allTags.find(t => t.slug === slug)

  if (!tagMeta) notFound()

  const tagPosts = await getPostsByTag(slug)
  const indexable = tagPosts.length >= NOINDEX_THRESHOLD

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { label: 'News', href: '/news' },
              { label: tagMeta.label },
            ]}
          />
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-foreground">{tagMeta.label}</h1>
            <Badge variant="secondary">{tagPosts.length} article{tagPosts.length === 1 ? '' : 's'}</Badge>
          </div>
          <p className="mt-2 text-muted-foreground text-sm">
            Forex news and analysis tagged &ldquo;{tagMeta.label}&rdquo; on BestForex.io.
          </p>
          {!indexable && (
            <p className="mt-2 text-xs text-muted-foreground italic">
              This topic page will be indexed once it contains {NOINDEX_THRESHOLD}+ articles.
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {tagPosts.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">No articles found for this tag yet.</p>
        ) : (
          <ol className="space-y-6" aria-label={`Articles tagged ${tagMeta.label}`}>
            {tagPosts.map((post) => (
              <li key={post.slug} className="group">
                <article className="flex gap-5 p-5 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs capitalize">{post.category}</Badge>
                      <time
                        dateTime={post.publishedAt}
                        className="text-xs text-muted-foreground"
                      >
                        {formatDate(new Date(post.publishedAt))}
                      </time>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                      <Link href={`/news/${post.slug}`} className="hover:underline underline-offset-2">
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {post.author && (
                        <Link
                          href={`/news/author/${post.author.slug}`}
                          className="hover:text-primary transition-colors"
                        >
                          {post.author.name}
                        </Link>
                      )}
                      {post.readingTime && <span>{post.readingTime}</span>}
                      {/* Surface other tags for cross-discovery */}
                      {post.tags && post.tags.filter(t => tagToSlug(t) !== slug).slice(0, 3).map(t => (
                        <Link
                          key={t}
                          href={`/news/tag/${tagToSlug(t)}`}
                          className="hover:text-primary transition-colors"
                        >
                          #{t}
                        </Link>
                      ))}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
