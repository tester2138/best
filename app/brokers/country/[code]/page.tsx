import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrokerLogo } from '@/components/brokers/broker-logo'
import { RatingStars } from '@/components/ui/rating-stars'
import { OutLink } from '@/components/ui/out-link'
import { Button } from '@/components/ui/button'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { getDirectoryCountries } from '@/data/directory'
import { getPublicDirectoryCompanies } from '@/lib/public-brokers'
import { SITE_URL } from '@/lib/site-config'
import { isRetailEntityType } from '@/lib/directory-types'

interface PageProps {
  params: Promise<{ code: string }>
}

// T53: noindex by default; flip indexable to true only when Kerem adds intro copy.
const INDEXABLE_COUNTRIES: string[] = []

function normaliseCountryCode(code: string): string {
  return decodeURIComponent(code).replace(/-/g, ' ')
}

async function getCountryBrokers(country: string) {
  const directoryCompanies = await getPublicDirectoryCompanies()
  return directoryCompanies
    .filter(c => isRetailEntityType(c.entityType))
    .filter(c => {
      const cLower = country.toLowerCase()
      return (
        c.country?.toLowerCase() === cLower ||
        c.headquarters?.toLowerCase().includes(cLower) ||
        c.countriesServed?.some(s => s.toLowerCase() === cLower)
      )
    })
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
}

export async function generateStaticParams() {
  const countries = getDirectoryCountries()
  return countries.map(c => ({ code: c.toLowerCase().replace(/\s+/g, '-') }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const country = normaliseCountryCode(code)
  const results = await getCountryBrokers(country)
  if (results.length === 0) return { title: 'Not Found' }

  const isIndexable = INDEXABLE_COUNTRIES.includes(code.toLowerCase())
  const title = `Best Forex Brokers for ${country} | BestForex.io`
  const description = `Compare the top forex brokers regulated and available for traders in ${country}. View ratings, platforms, and conditions.`
  const url = `${SITE_URL}/brokers/country/${code}`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    ...(isIndexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, url, type: 'website' },
  }
}

export default async function CountryBrokersPage({ params }: PageProps) {
  const { code } = await params
  const country = normaliseCountryCode(code)
  const brokers = await getCountryBrokers(country)
  if (brokers.length === 0) notFound()

  const breadcrumbItems = [
    { label: 'Forex Brokers', href: '/brokers' },
    { label: `Best for ${country}` },
  ]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      {/* noindex meta handled via generateMetadata */}

      <div className="bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      <section className="border-b border-border py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            Best Forex Brokers for {country}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            {brokers.length} broker{brokers.length !== 1 ? 's' : ''} regulated or available for traders in {country}.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {brokers.map((broker, rank) => (
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
                  websiteUrl={broker.websiteUrl}
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
                  {broker.regulators && broker.regulators.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {broker.regulators.slice(0, 3).map(r => (
                        <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
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
        ))}
      </div>
    </>
  )
}
