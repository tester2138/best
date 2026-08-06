import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { getAuthorBySlug, getPostsByAuthor, getPublishedAuthors, getEditorialType } from '@/data/posts'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

interface AuthorPageProps {
  params: Promise<{ slug: string }>
}

// Scheduling: re-render hourly so an author's newly-scheduled articles appear
// on their publish date. getPostsByAuthor only returns published posts.
export const revalidate = 3600

export async function generateStaticParams() {
  return (await getPublishedAuthors()).map((author) => ({ slug: author.slug }))
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params
  const author = getAuthorBySlug(slug)
  if (!author) return { title: 'Author Not Found' }

  const url = `${SITE_URL}/news/author/${author.slug}`
  const title = `${author.name} — ${author.role} | ${SITE_NAME}`
  const description = author.bio

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${author.name} — ${author.role}`,
      description,
      url,
      type: 'profile',
      ...(author.avatar && { images: [{ url: `${SITE_URL}${author.avatar}` }] }),
    },
  }
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params
  const author = getAuthorBySlug(slug)
  if (!author) notFound()

  const authorPosts = await getPostsByAuthor(slug)
  const url = `${SITE_URL}/news/author/${author.slug}`

  // T58: knowsAbout from author.beat when present, else editorial fallback.
  // sameAs populated from author.sameAs (LinkedIn, Twitter, etc.) when supplied.
  const knowsAbout = author.beat && author.beat.length > 0
    ? author.beat
    : ['Forex trading', 'CFD brokers', 'Financial regulation', 'Retail trading']

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${url}#person`,
    name: author.name,
    url,
    jobTitle: author.role,
    description: author.bio,
    ...(author.avatar && { image: `${SITE_URL}${author.avatar}` }),
    worksFor: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    knowsAbout,
    ...(author.sameAs && author.sameAs.length > 0 && { sameAs: author.sameAs }),
  }

  return (
    <div className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <BreadcrumbSchema
        items={[
          { label: 'News', href: '/news' },
          { label: 'Authors', href: '/news/author' },
          { label: author.name },
        ]}
      />

      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs
            items={[
              { label: 'News', href: '/news' },
              { label: 'Authors', href: '/news/author' },
              { label: author.name },
            ]}
          />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Author header */}
        <header className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
            {author.avatar && (
              <Image
                src={author.avatar}
                alt={`Portrait of ${author.name}, ${author.role} at ${SITE_NAME}`}
                fill
                className="object-cover"
                sizes="112px"
                priority
              />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground text-balance">{author.name}</h1>
            <p className="mt-1 text-primary font-medium">{author.role}</p>
            <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">{author.bio}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {author.name} is an editorial pen name of the BestForex.io in-house critic desk. See our{' '}
              <Link href="/editorial-policy" className="text-primary hover:underline">
                editorial policy
              </Link>
              .
            </p>
          </div>
        </header>

        {/* Author's articles */}
        <section className="mt-12" aria-labelledby="author-articles">
          <h2 id="author-articles" className="text-xl font-semibold text-foreground">
            {`Articles by ${author.name}`}
          </h2>

          {authorPosts.length === 0 ? (
            <p className="mt-4 text-muted-foreground">
              {author.name} has not published any articles yet. Browse our{' '}
              <Link href="/news" className="text-primary hover:underline">
                latest forex news and analysis
              </Link>
              .
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              {authorPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden transition-all hover:shadow-lg group">
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <Link
                      href={`/news/${post.slug}`}
                      className="relative aspect-[4/3] w-full sm:w-56 shrink-0 overflow-hidden bg-muted"
                    >
                      {post.featuredImage && (
                        <Image
                          src={post.featuredImage}
                          alt={post.imageAltText ?? post.title}
                          fill
                          className="object-contain transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, 224px"
                        />
                      )}
                    </Link>
                    <div className="flex-1 p-6">
                      <Badge variant="outline" className="mb-2 text-xs">
                        {getEditorialType(post)}
                      </Badge>
                      <Link href={`/news/${post.slug}`}>
                        <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {post.title}
                        </h3>
                      </Link>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                        {post.excerpt}
                      </p>
                      <Link href={`/news/${post.slug}`}>
                        <Button variant="ghost" size="sm" className="mt-3 text-primary hover:text-primary/90 -ml-2">
                          Read More →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
