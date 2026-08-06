import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrokerLogo } from '@/components/brokers/broker-logo'
import { RatingStars } from '@/components/ui/rating-stars'
import { OutLink } from '@/components/ui/out-link'
import { Button } from '@/components/ui/button'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { getPublicDirectoryCompanies } from '@/lib/public-brokers'
import { SITE_URL } from '@/lib/site-config'
import { isRetailEntityType } from '@/lib/directory-types'
import type { DirectoryCompany } from '@/lib/directory-types'

interface PageProps {
  params: Promise<{ category: string }>
}

// ─── Category definitions ────────────────────────────────────────────────────

type BestCategory = {
  label: string
  description: string
  /** String tokens that a broker's platforms/instruments/badges/bestFor must contain */
  matchTerms: string[]
}

const BEST_CATEGORIES: Record<string, BestCategory> = {
  mt4: {
    label: 'Best MetaTrader 4 (MT4) Brokers',
    description: 'Top-rated brokers offering full MetaTrader 4 support with tight spreads and fast execution.',
    matchTerms: ['mt4', 'metatrader 4', 'metatrader4'],
  },
  mt5: {
    label: 'Best MetaTrader 5 (MT5) Brokers',
    description: 'Top-rated brokers offering full MetaTrader 5 support with advanced charting and multi-asset trading.',
    matchTerms: ['mt5', 'metatrader 5', 'metatrader5'],
  },
  ecn: {
    label: 'Best ECN Brokers',
    description: 'ECN brokers with direct market access, tight raw spreads, and transparent pricing.',
    matchTerms: ['ecn'],
  },
  'low-spread': {
    label: 'Best Low-Spread Forex Brokers',
    description: 'Brokers with the tightest spreads on major forex pairs — ideal for scalpers and frequent traders.',
    matchTerms: ['low spread', 'tight spread', 'raw spread', 'ecn'],
  },
  islamic: {
    label: 'Best Islamic (Swap-Free) Forex Brokers',
    description: 'Brokers offering compliant swap-free Islamic accounts for Muslim traders.',
    matchTerms: ['islamic', 'swap-free', 'swap free'],
  },
  beginners: {
    label: 'Best Forex Brokers for Beginners',
    description: 'Beginner-friendly brokers with educational resources, demo accounts, and low minimum deposits.',
    matchTerms: ['beginner', 'educational', 'education', 'demo'],
  },
}

// T53: noindex by default; flip to true only when Kerem adds intro copy.
const INDEXABLE_CATEGORIES: string[] = []

async function getCategoryBrokers(slug: string): Promise<DirectoryCompany[]> {
  const cat = BEST_CATEGORIES[slug]
  if (!cat) return []
  const terms = cat.matchTerms
  const companies = await getPublicDirectoryCompanies()

  return companies
    .filter(c => isRetailEntityType(c.entityType))
    .filter(c => {
      const searchable = [
        ...(c.platforms ?? []),
        ...(c.instruments ?? []),
        ...(c.bestFor ?? []),
        ...(c.badges ?? []),
        c.shortDescription ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return terms.some(t => searchable.includes(t))
    })
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 20)
}

export function generateStaticParams() {
  return Object.keys(BEST_CATEGORIES).map(slug => ({ category: slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params
  const cat = BEST_CATEGORIES[category]
  if (!cat) return { title: 'Not Found' }

  const isIndexable = INDEXABLE_CATEGORIES.includes(category)
  const url = `${SITE_URL}/brokers/best/${category}`

  return {
    title: { absolute: `${cat.label} 2026 | BestForex.io` },
    description: cat.description,
    alternates: { canonical: url },
    ...(isIndexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title: cat.label, description: cat.description, url, type: 'website' },
  }
}

export default async function BestCategoryPage({ params }: PageProps) {
  const { category } = await params
  const cat = BEST_CATEGORIES[category]
  if (!cat) notFound()

  const brokers = await getCategoryBrokers(category)

  const breadcrumbItems = [
    { label: 'Forex Brokers', href: '/brokers' },
    { label: cat.label },
  ]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      <section className="border-b border-border py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            {cat.label}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">{cat.description}</p>
          {brokers.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {brokers.length} broker{brokers.length !== 1 ? 's' : ''} matched
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {brokers.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            No brokers matched this filter yet — check back soon.
          </p>
        ) : (
          brokers.map((broker, rank) => (
            <Card key={broker.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <span className="text-lg font-bold text-muted-foreground w-7 flex-shrink-0 mt-1">
                    #{rank + 1}
                  </span>
                  <BrokerLogo
                    name={broker.name}
                    slug={broker.slug}
                    logoUrl={broker.logoUrl}
                    size="md"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Link
                        href={`/brokers/${broker.slug}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {broker.name}
                      </Link>
                      {broker.rating && (
                        <RatingStars rating={broker.rating} size="sm" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {broker.shortDescription}
                    </p>
                    {broker.platforms && broker.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {broker.platforms.slice(0, 4).map(p => (
                          <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {broker.affiliateUrl && (
                      <OutLink href={broker.affiliateUrl} sponsored>
                        <Button size="sm">Visit Broker</Button>
                      </OutLink>
                    )}
                    <Link
                      href={`/brokers/${broker.slug}`}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Full Review
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  )
}
