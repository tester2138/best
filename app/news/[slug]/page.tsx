import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { NewsSidebar } from '@/components/news/news-sidebar'
import Link from 'next/link'
import { formatDate, readMinutes } from '@/lib/utils'
import { getPostBySlug, getEditorialType } from '@/data/posts'
import { ShareButtons } from './share-buttons'
import { SITE_URL, SITE_NAME, SITE_LOGO, SITE_OG_IMAGE } from '@/lib/site-config'
import type { Metadata } from 'next'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

// Scheduling: getPostBySlug returns undefined for a post whose publishedAt is
// still in the future, so a staged article 404s until its date. Re-rendering
// hourly lets it go live automatically once the date arrives — no deploy.
export const revalidate = 3600

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Article Not Found',
      description: 'The requested article could not be found.'
    }
  }

  // Use SEO-optimized meta fields if available. Strip any pre-baked
  // "| BestForex.io" brand suffix from the data so the root layout's title
  // template (`%s | BestForex.io`) doesn't append it a second time.
  // P2-268: cap the headline segment at 55 chars so the final rendered title
  // (metaTitle + " | BestForex.io" ≈ 14 chars) stays within the ~70-char SERP
  // display limit. The H1 on the page retains the full headline unchanged.
  const RAW_TITLE_LIMIT = 55
  const rawTitle = (post.metaTitle || post.title).replace(/\s*\|\s*BestForex\.io\s*$/i, '')
  const metaTitle = rawTitle.length > RAW_TITLE_LIMIT
    ? rawTitle.slice(0, RAW_TITLE_LIMIT).replace(/[\s,]+$/, '') + '…'
    : rawTitle
  const metaDescription = post.metaDescription || post.excerpt

  return {
    title: metaTitle,
    description: metaDescription,
    authors: [{ name: post.author?.name || 'BestForex Editorial' }],
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'article',
      publishedTime: toIsoDate(post.publishedAt),
      modifiedTime: toIsoDate(post.updatedAt || post.publishedAt),
      url: `${SITE_URL}/news/${post.slug}`,
      siteName: SITE_NAME,
      images: [{
        url: post.featuredImage || SITE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: post.imageAltText || post.title
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: [post.featuredImage || SITE_OG_IMAGE],
    },
    alternates: {
      canonical: `${SITE_URL}/news/${post.slug}`
    }
  }
}

// Normalize a date string (e.g. '2026-06-17') to a full ISO 8601 timestamp with
// a UTC offset, as required by the Google News / NewsArticle protocols.
function toIsoDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// Resolve a possibly-relative image path to an absolute URL on the canonical host.
function toAbsoluteImage(src?: string): string {
  if (!src) return SITE_OG_IMAGE
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  return `${SITE_URL}${src.startsWith('/') ? src : `/${src}`}`
}

// NewsArticle JSON-LD — Google News structured-data requirements.
function generateArticleSchema(post: Awaited<ReturnType<typeof getPostBySlug>>) {
  if (!post) return null

  // T43: Google requires OpinionNewsArticle for opinion/editorial pieces.
  // 'opinion' category will be populated via T28 category taxonomy.
  const articleType = post.category === 'opinion' ? 'OpinionNewsArticle' : 'NewsArticle'

  return {
    '@context': 'https://schema.org',
    '@type': articleType,
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    image: [toAbsoluteImage(post.featuredImage)],
    datePublished: toIsoDate(post.publishedAt),
    dateModified: toIsoDate(post.updatedAt || post.publishedAt),
    author: post.author
      ? {
          '@type': 'Person',
          name: post.author.name,
          url: `${SITE_URL}/news/author/${post.author.slug}`,
          ...(post.author.role && { jobTitle: post.author.role }),
          ...(post.author.bio && { description: post.author.bio }),
          ...(post.author.avatar && {
            image: post.author.avatar.startsWith('http')
              ? post.author.avatar
              : `${SITE_URL}${post.author.avatar}`,
          }),
        }
      : { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: SITE_LOGO
      }
    },
    articleSection: post.category,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/news/${post.slug}`
    },
    wordCount: post.wordCount || 0,
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const articleSchema = generateArticleSchema(post)

  return (
    <div className="bg-background">
      {/* JSON-LD Schema */}
      {articleSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      )}
      <BreadcrumbSchema
        items={[
          { label: 'News', href: '/news' },
          { label: post.title },
        ]}
      />

      {/* Breadcrumbs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-4xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'News', href: '/news' },
              { label: post.title.length > 40 ? post.title.substring(0, 40) + '...' : post.title }
            ]}
          />
        </div>
      </div>

      {/* Article Header */}
      <section className="border-b border-border py-12 sm:py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            {(() => {
              const editorialType = getEditorialType(post)
              return editorialType !== 'News' ? (
                <Badge className="bg-primary text-primary-foreground uppercase tracking-wide text-xs">
                  {editorialType}
                </Badge>
              ) : null
            })()}
            <Badge variant="outline" className="capitalize">{post.category}</Badge>
            <span className="text-sm text-muted-foreground">
              {formatDate(new Date(post.publishedAt))}
            </span>
            {post.wordCount && post.wordCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {readMinutes(post.wordCount)}
              </span>
            )}
          </div>
          <h1 className="text-balance mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {post.excerpt}
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span>By</span>
            {post.author ? (
              <Link
                href={`/news/author/${post.author.slug}`}
                className="font-semibold text-foreground hover:text-primary transition-colors"
              >
                {post.author.name}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">BestForex Editorial</span>
            )}
            {post.author?.role && (
              <>
                <span>•</span>
                <span>{post.author.role}</span>
              </>
            )}
            {post.sourceName && (
              <>
                <span>•</span>
                <span>Source: {post.sourceName}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Featured Image */}
      <div className="border-b border-border">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <figure>
            {post.featuredImage && !post.featuredImage.includes('.private.blob.') ? (
              /* Row 78: next/image with realistic sizes cap.
                 Max display width on desktop is ~896px (max-w-4xl container minus padding).
                 Prevents the default 3840w srcset variant from being emitted for a
                 banner that will never render wider than ~900px. */
              <Image
                src={post.featuredImage}
                alt={post.imageAltText || post.title}
                width={1200}
                height={675}
                className="w-full h-auto rounded-lg object-cover aspect-video"
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 896px"
              />
            ) : (
              /* Default branded placeholder for private blob or missing images */
              <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center">
                <span className="text-slate-400 text-lg tracking-wider">BESTFOREX.IO</span>
                <span className="text-slate-100 text-2xl font-bold mt-2">FOREX NEWS</span>
                <div className="w-24 h-1 bg-primary mt-4 rounded-full"></div>
              </div>
            )}
            {post.imageAltText && (
              <figcaption className="mt-2 text-sm text-muted-foreground text-center">
                {post.imageAltText}
              </figcaption>
            )}
          </figure>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Article */}
          <article className="lg:col-span-2">
            <div className="prose prose-lg prose-slate max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:underline prose-strong:text-foreground prose-strong:font-semibold">
              {post.content ? (
                // Render HTML content from AI-generated articles
                <div 
                  dangerouslySetInnerHTML={{ __html: post.content }} 
                  className="space-y-4 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-3"
                />
              ) : (
                <div className="space-y-6 text-foreground">
                  <p className="leading-relaxed">{post.excerpt}</p>
                  <p className="leading-relaxed text-muted-foreground italic">
                    Full article content coming soon. Check back for the complete analysis.
                  </p>
                </div>
              )}
            </div>

            {/* Related Brokers */}
            {post.relatedBrokers && post.relatedBrokers.length > 0 && (
              <div className="mt-12 border-t border-border pt-8">
                <h3 className="font-semibold text-foreground mb-4">Related Brokers</h3>
                <div className="flex flex-wrap gap-2">
                  {post.relatedBrokers.map((brokerSlug: string, idx: number) => (
                    <Link key={idx} href={`/brokers/${brokerSlug}`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                        {brokerSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Rows 163+164: Editor note / correction callout — shown when editorNote is set */}
            {post.editorNote && (
              <aside
                className="mt-10 border-l-4 border-primary/40 bg-primary/5 rounded-r-lg px-5 py-4"
                aria-label="Editor's note"
              >
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                  Editor&apos;s Note
                </p>
                <p className="text-sm text-foreground leading-relaxed">{post.editorNote}</p>
              </aside>
            )}

            {/* T54: Linked sources — rendered when linkedSources field is populated */}
            {post.linkedSources && post.linkedSources.length > 0 && (
              <div className="mt-10 border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Sources</h3>
                <ol className="space-y-1 list-decimal list-inside">
                  {post.linkedSources.map((src, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors underline underline-offset-2"
                      >
                        {src.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Share Section */}
            <div className="mt-12 border-t border-border pt-8">
              <h3 className="font-semibold text-foreground mb-4">Share this article</h3>
              <ShareButtons title={post.title} slug={post.slug} />
            </div>
          </article>

          {/* Sidebar — shared with the /news listing page to stay coordinated */}
          <NewsSidebar currentSlug={post.slug} />
        </div>
      </div>
    </div>
  )
}
