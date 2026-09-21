import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPostsByCategory } from '@/data/posts'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { SITE_URL } from '@/lib/site-config'
import { readMinutes } from '@/lib/utils'

// Scheduling: re-render frequently so scheduled posts join their category
// archive close to their publish date. The query only returns published posts.
export const revalidate = 300

const CATEGORY_LABELS: Record<string, string> = {
  news: 'News',
  opinion: 'Opinion',
  analysis: 'Analysis',
  education: 'Education',
  guide: 'Guides',
  review: 'Reviews',
}

// Static params for the known categories — keeps the route pre-renderable
// while ISR ensures newly-populated categories appear after revalidation.
export function generateStaticParams() {
  return Object.keys(CATEGORY_LABELS).map((category) => ({ category }))
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const label = CATEGORY_LABELS[category] || category
  const canonical = `${SITE_URL}/news/category/${category}`

  return {
    title: `${label} Articles`,
    description: `Browse the latest forex ${label.toLowerCase()} articles, insights and updates from the BestForex.io editorial team.`,
    alternates: { canonical },
    openGraph: {
      title: `${label} Articles | BestForex.io`,
      description: `Browse the latest forex ${label.toLowerCase()} articles from BestForex.io.`,
      url: canonical,
      type: 'website',
    },
  }
}

export default async function CategoryArchivePage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const categoryPosts = (await getPostsByCategory(category)).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() ||
      a.slug.localeCompare(b.slug),
  )

  // No posts in this category -> 404 rather than a thin archive page.
  if (categoryPosts.length === 0) {
    notFound()
  }

  const label = CATEGORY_LABELS[category] || category
  const breadcrumbItems = [{ label: 'News', href: '/news' }, { label }]

  return (
    <div className="bg-background">
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, ...breadcrumbItems]} />
        </div>
      </div>

      <section className="border-b border-border py-12 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {label}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            {`Showing ${categoryPosts.length} ${categoryPosts.length === 1 ? 'article' : 'articles'} in ${label}.`}
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categoryPosts.map((post) => (
              <li key={post.slug}>
                <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
                  {post.featuredImage && (
                    <Link
                      href={`/news/${post.slug}`}
                      className="relative block aspect-[16/9] w-full overflow-hidden bg-muted"
                      aria-label={post.title}
                    >
                      <Image
                        src={post.featuredImage}
                        alt={post.imageAltText ?? post.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </Link>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <Badge variant="outline" className="mb-3 w-fit capitalize text-xs">
                      {label}
                    </Badge>
                    <Link href={`/news/${post.slug}`}>
                      <h2 className="text-lg font-semibold leading-snug text-foreground group-hover:text-primary transition-colors text-pretty">
                        {post.title}
                      </h2>
                    </Link>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {post.wordCount && post.wordCount > 0 && (
                        <span>{readMinutes(post.wordCount)}</span>
                      )}
                      <span aria-hidden>·</span>
                      <span>
                        By{' '}
                        <Link
                          href={`/news/author/${post.author.slug}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {post.author.name}
                        </Link>
                      </span>
                      <span aria-hidden>·</span>
                      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Link href="/news" className="text-sm font-medium text-primary hover:underline">
              ← Back to all news
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
