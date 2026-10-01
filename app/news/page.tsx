import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { AdSlot } from '@/components/ads/ad-slot'
import { NewsSidebar } from '@/components/news/news-sidebar'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate, readMinutes } from '@/lib/utils'
import { getVisiblePosts, getEditorialType } from '@/data/posts'
import { BarChart2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { getPublicCategories } from '@/lib/public-categories'

// Scheduling: re-render frequently so future-dated posts appear close to their
// release time without a deploy. Visibility is computed at render time.
export const revalidate = 300

// T59: paginate at 12 articles per page (balances content density with LCP).
const ITEMS_PER_PAGE = 12
const BASE_URL = `${SITE_URL}/news`

function parsePage(value?: string): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 1
}

function sortPostsByDate<T extends { publishedAt: string; slug: string }>(posts: T[]): T[] {
  return [...posts].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() ||
      a.slug.localeCompare(b.slug),
  )
}

interface NewsPageProps {
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ searchParams }: NewsPageProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams
  const requestedPage = parsePage(pageParam)
  const sortedPosts = sortPostsByDate(await getVisiblePosts())
  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / ITEMS_PER_PAGE))
  const page = Math.min(requestedPage, totalPages)
  const isFirstPage = page === 1

  const title = isFirstPage
    ? 'Forex & Trading News'
    : `Forex & Trading News — Page ${page}`

  const canonical = isFirstPage ? BASE_URL : `${BASE_URL}?page=${page}`

  return {
    title,
    description: 'Latest forex market insights, broker updates, and trading analysis from the BestForex.io editorial team.',
    alternates: {
      canonical,
      types: { 'application/rss+xml': `${BASE_URL}/feed.xml` },
      ...(page > 1 && { prev: page === 2 ? BASE_URL : `${BASE_URL}?page=${page - 1}` }),
      ...(page < totalPages && { next: `${BASE_URL}?page=${page + 1}` }),
    },
    openGraph: {
      title: `${title} | BestForex.io`,
      description: 'Latest forex market insights, broker updates, and trading analysis from the BestForex.io editorial team.',
      url: canonical,
      type: 'website',
    },
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  news: 'bg-blue-50 text-blue-700 border-blue-200',
  analysis: 'bg-amber-50 text-amber-700 border-amber-200',
  education: 'bg-green-50 text-green-700 border-green-200',
  guide: 'bg-purple-50 text-purple-700 border-purple-200',
  review: 'bg-orange-50 text-orange-700 border-orange-200',
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { page: pageParam } = await searchParams
  const currentPage = parsePage(pageParam)

  // Computed per request so scheduled posts and category edits join the archive promptly.
  const [visiblePosts, categories] = await Promise.all([getVisiblePosts(), getPublicCategories()])
  const sortedPosts = sortPostsByDate(visiblePosts)
  const availableCategories = new Set<string>(sortedPosts.map((p) => p.category))
  const visibleCategories = categories.filter((category) => availableCategories.has(category.slug))
  const categoryNames = new Map(categories.map((category) => [category.slug, category.name]))

  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const offset = (safePage - 1) * ITEMS_PER_PAGE
  const pagePosts = sortedPosts.slice(offset, offset + ITEMS_PER_PAGE)

  const prevHref = safePage > 1 ? (safePage === 2 ? '/news' : `/news?page=${safePage - 1}`) : null
  const nextHref = safePage < totalPages ? `/news?page=${safePage + 1}` : null

  return (
    <div className="bg-background">
      <BreadcrumbSchema items={[{ label: 'News' }]} />
      {/* Breadcrumbs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'News' }]} />
        </div>
      </div>

      {/* Header */}
      <section className="border-b border-border py-12 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Forex &amp; Trading News
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Latest market insights, broker updates, and trading analysis.
          </p>

          {/* Category filter pills — real crawlable links to archives */}
          <nav aria-label="News categories" className="mt-6 flex flex-wrap gap-2">
            <Link href="/news">
              <Badge variant="outline" className="text-xs px-3 py-1 hover:bg-primary/10 transition-colors">All Articles</Badge>
            </Link>
            {visibleCategories.map((category) => (
              <Link key={category.slug} href={`/news/category/${category.slug}`}>
                <Badge variant="outline" className="text-xs px-3 py-1 hover:bg-primary/10 transition-colors">{category.name}</Badge>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Ad banners */}
      <div className="bg-secondary/30 py-3">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AdSlot placementKey="horizontal-1" fluid />
            <AdSlot placementKey="horizontal-2" fluid />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">

          {/* Posts list */}
          <div className="lg:col-span-2 space-y-6">
            {pagePosts.map((post) => (
              <Card key={post.id} className="overflow-hidden transition-all hover:shadow-lg group">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  {/* Thumbnail */}
                  <Link
                    href={`/news/${post.slug}`}
                    className="relative aspect-[4/3] w-full sm:w-56 shrink-0 overflow-hidden bg-muted flex items-center justify-center"
                  >
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-contain transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 224px"
                      />
                    ) : (
                      <BarChart2 className="w-10 h-10 text-primary/20" />
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getEditorialType(post) !== 'News' && (
                        <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
                          {getEditorialType(post)}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                          CATEGORY_COLORS[post.category] ?? 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {categoryNames.get(post.category) ?? post.category}
                      </span>
                      {/* T20: computed read time */}
                      {post.content && (
                        <>
                          <span className="text-xs text-muted-foreground">
                            {readMinutes(post.content.split(/\s+/).length)}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(new Date(post.publishedAt))}
                      </span>
                    </div>

                    <Link href={`/news/${post.slug}`}>
                      <h2 className="mt-3 text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h2>
                    </Link>

                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                      {post.excerpt}
                    </p>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        By{' '}
                        <Link
                          href={`/news/author/${post.author.slug}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {post.author.name}
                        </Link>
                      </span>
                      <Link href={`/news/${post.slug}`}>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90 -mr-2">
                          Read More →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* T59: Pagination nav */}
            {totalPages > 1 && (
              <nav
                aria-label="News pagination"
                className="flex items-center justify-between pt-4 border-t border-border"
              >
                {prevHref ? (
                  <Link
                    href={prevHref}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    rel="prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Newer articles
                  </Link>
                ) : (
                  <span />
                )}

                <p className="text-xs text-muted-foreground">
                  Page {safePage} of {totalPages}
                </p>

                {nextHref ? (
                  <Link
                    href={nextHref}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    rel="next"
                  >
                    Older articles
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </div>

          {/* Sidebar */}
          <NewsSidebar />
        </div>
      </div>
    </div>
  )
}
