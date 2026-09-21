import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { getPublishedAuthors, getPostsByAuthor } from '@/data/posts'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

// Scheduling: re-render frequently so an author appears/updates soon after a
// scheduled article goes live. Helpers only count published posts.
export const revalidate = 300

const title = `Our Editorial Team & Forex Analysts | ${SITE_NAME}`
const description =
  'Meet the analysts, journalists and regulatory critics behind BestForex.io. Our editorial desk independently reviews and rates forex brokers and covers the global trading industry.'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/news/author` },
  openGraph: { title, description, url: `${SITE_URL}/news/author` },
}

export default async function AuthorsIndexPage() {
  const authors = await getPublishedAuthors()
  const authorCounts = await Promise.all(
    authors.map((a) => getPostsByAuthor(a.slug).then((p) => ({ slug: a.slug, count: p.length })))
  )
  const countMap = Object.fromEntries(authorCounts.map(({ slug, count }) => [slug, count]))

  return (
    <div className="bg-background">
      <BreadcrumbSchema items={[{ label: 'News', href: '/news' }, { label: 'Authors' }]} />

      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={[{ label: 'News', href: '/news' }, { label: 'Authors' }]} />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <header className="max-w-2xl">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground text-balance">
            Meet the Editorial Team
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            BestForex.io columns are written by an in-house critic desk of experienced markets
            analysts, financial journalists and regulatory specialists. These are consistent
            editorial pen names — read more in our{' '}
            <Link href="/editorial-policy" className="text-primary hover:underline">
              editorial policy
            </Link>
            .
          </p>
        </header>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {authors.map((author) => {
            const count = countMap[author.slug] ?? 0
            return (
              <Card key={author.slug} className="p-6 transition-all hover:shadow-lg">
                <Link href={`/news/author/${author.slug}`} className="flex items-start gap-4 group">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                    {author.avatar && (
                      <Image
                        src={author.avatar}
                        alt={`Portrait of ${author.name}, ${author.role}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {author.name}
                    </h2>
                    <p className="text-sm text-primary">{author.role}</p>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {author.bio}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {count} {count === 1 ? 'article' : 'articles'}
                    </p>
                  </div>
                </Link>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
