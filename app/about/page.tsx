import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { getPublishedAuthors, getPostsByAuthor } from '@/data/posts'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

const title = `About BestForex.io — Who We Are & How We Operate`
const description =
  'BestForex.io is an independent forex and CFD broker review publisher. Learn who owns and operates the site, our editorial mission and our commitment to independence.'

export const metadata: Metadata = {
  title: { absolute: `${title} | ${SITE_NAME}` },
  description,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: { title, description, url: `${SITE_URL}/about` },
}

export default async function AboutPage() {
  const authors = await getPublishedAuthors()
  // Pre-fetch article counts so the map below stays sync.
  const authorCounts = await Promise.all(
    authors.map((a) => getPostsByAuthor(a.slug).then((p) => ({ slug: a.slug, count: p.length })))
  )
  const countMap = Object.fromEntries(authorCounts.map(({ slug, count }) => [slug, count]))

  return (
    <div className="bg-background">
      <BreadcrumbSchema items={[{ label: 'About' }]} />

      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-4xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />
        </div>
      </div>

      <section className="border-b border-border py-12 sm:py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            About BestForex.io
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Independent forex and CFD broker research, reviews and market commentary — published for
            retail traders, not the brokers we cover.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Who We Are</h2>
          <p className="mt-4 text-foreground leading-relaxed">
            BestForex.io is an independent online publisher specialising in the retail forex, CFD and
            prop-trading industry. The site is owned and operated by BestForex.io, a privately run
            editorial and research operation. We maintain a directory of more than 1,800 brokers
            alongside original news, analysis and opinion covering the firms, regulators and products
            that shape retail trading.
          </p>
        </section>

        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
          <p className="mt-4 text-foreground leading-relaxed">
            Retail traders are marketed to relentlessly and protected sparingly. Our mission is to
            close that information gap: to compare brokers on facts — regulation, costs, platforms and
            real client outcomes — and to scrutinise the distance between what the industry advertises
            and what it actually delivers. We exist to help traders make better-informed decisions, not
            to sell them to the highest bidder.
          </p>
        </section>

        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground">Editorial Independence</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-semibold text-foreground">Ratings Are Not For Sale</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                We do not accept payment from brokers in exchange for favourable reviews, ratings or
                coverage. Our editorial judgements are made independently of any commercial relationship.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold text-foreground">Affiliate Disclosure</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Some links are affiliate links and we may earn a commission when you sign up through
                them. This never influences our rankings, scores or editorial opinions.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold text-foreground">Clearly Labelled Opinion</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Our columns are sharp and opinionated. Opinion and analysis are clearly badged as such
                and separated from factual reporting — see our{' '}
                <Link href="/editorial-policy" className="text-primary hover:underline">
                  editorial policy
                </Link>
                .
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold text-foreground">Corrections</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                We correct errors openly and promptly. Read how on our{' '}
                <Link href="/corrections" className="text-primary hover:underline">
                  corrections page
                </Link>
                .
              </p>
            </Card>
          </div>
        </section>

        {/* Meet the Editorial Team */}
        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground">Meet the Editorial Team</h2>
          <p className="mt-4 text-foreground leading-relaxed">
            Our columns are written by an in-house critic desk. These are consistent editorial pen
            names representing our writers — a common practice for opinion desks. Full disclosure is in
            our{' '}
            <Link href="/editorial-policy" className="text-primary hover:underline">
              editorial policy
            </Link>
            .
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
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
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {author.name}
                      </h3>
                      <p className="text-sm text-primary">{author.role}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {count} {count === 1 ? 'article' : 'articles'}
                      </p>
                    </div>
                  </Link>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground">Contact</h2>
          <p className="mt-4 text-foreground leading-relaxed">
            Editorial enquiries, story tips and correction requests:{' '}
            <a href="mailto:editorial@bestforex.io" className="text-primary hover:underline">
              editorial@bestforex.io
            </a>
            . General enquiries:{' '}
            <a href="mailto:info@bestforex.io" className="text-primary hover:underline">
              info@bestforex.io
            </a>
            . You can also use our{' '}
            <Link href="/contact-us" className="text-primary hover:underline">
              contact form
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
