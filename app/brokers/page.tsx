import type { Metadata } from 'next'
import Link from 'next/link'
import { Globe, TrendingUp, Shield, Award, Database, Building2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { AdSlot } from '@/components/ads/ad-slot'
import { DirectoryClient } from './directory-client'
import {
  rankedBrokers,
  getDirectoryStats,
  getDirectoryCountries, 
  getDirectoryRegulators, 
  getDirectoryPlatforms 
} from '@/data/directory'
import { SITE_URL, SITE_OG_IMAGE } from '@/lib/site-config'
import { totalListed, regulatorCount, dataPointCount } from '@/lib/stats'
import { ItemListSchema } from '@/components/seo/item-list-schema'
import { getRankedPublicDirectory } from '@/lib/public-brokers'

const ITEMS_PER_PAGE = 20
const BASE_URL = `${SITE_URL}/brokers`
// T41: paginate only retail entity types (forex_broker, cfd_broker, prop_firm).
// Non-retail entries (exchanges, hedge funds, etc.) are in the full directory
// but excluded from the /brokers ranked list.
const TOTAL_COMPANIES = rankedBrokers.length
const TOTAL_PAGES = Math.ceil(TOTAL_COMPANIES / ITEMS_PER_PAGE)
// Human-readable "last reviewed" label, set at build time. Honest freshness
// signal for the ranking page (no per-request churn).
const LAST_UPDATED_LABEL = new Date().toLocaleDateString('en-US', {
  month: 'long',
  year: 'numeric',
})

// Editorial FAQ for the "best forex brokers" page — rendered visibly and as
// FAQPage structured data for rich-result eligibility.
const BROKERS_FAQ = [
  {
    question: 'What is the best forex broker in 2026?',
    answer:
      'There is no single best forex broker for everyone — the right choice depends on your country, account size, trading style and the platforms you prefer. We rank brokers by regulation, all-in trading costs, platform quality and funding reliability so you can shortlist the best forex broker for your needs and compare them side by side.',
  },
  {
    question: 'How does BestForex.io rank the best forex brokers?',
    answer:
      'Our analysts score each broker against more than 50 data points covering regulation and safety, spreads and commissions, platform quality, available markets, deposits and withdrawals, and customer support. Only brokers that meet our editorial data-quality standard are ranked and listed.',
  },
  {
    question: 'Are the forex brokers listed here regulated?',
    answer:
      'We prioritise brokers regulated by recognised authorities such as the FCA, ASIC, CySEC and NFA, and we display each broker’s regulatory status on its profile. Always confirm a broker is authorised to serve clients in your country before depositing funds.',
  },
  {
    question: 'How much money do I need to start trading forex?',
    answer:
      'Many of the best forex brokers let you open an account with $100 or less, and some offer no minimum deposit. Because forex and CFD trading is leveraged and high risk, only trade with money you can afford to lose.',
  },
]

const BROKERS_FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: BROKERS_FAQ.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Math.min(Number(pageParam) || 1, TOTAL_PAGES))
  const isFirstPage = page === 1

  // Row 99: de-cannibalize from homepage. Homepage owns "Best Forex Brokers 2026".
  // /brokers owns the rankings/directory angle — different keyword intent.
  const title = isFirstPage
    ? 'Forex Broker Rankings 2026: Compare 1,800+ Platforms | BestForex.io'
    : `Forex Broker Rankings 2026 — Page ${page} of ${TOTAL_PAGES} | BestForex.io`

  const description = isFirstPage
    ? 'Compare the best forex brokers in 2026. Our experts rank 1,800+ regulated forex brokers and CFD platforms by spreads, regulation, trading platforms and safety to help you find the best broker for you.'
    : `Best forex brokers in 2026 — page ${page} of our independently reviewed directory. Compare regulation, spreads, trading platforms and conditions across ${ITEMS_PER_PAGE} brokers.`

  const canonical = isFirstPage ? BASE_URL : `${BASE_URL}?page=${page}`

  return {
    // Title already includes the brand suffix, so use `absolute` to stop the
    // root template ("%s | BestForex.io") from appending it twice (audit #18).
    title: { absolute: title },
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: isFirstPage
        ? 'Forex Broker Rankings 2026'
        : `Forex Broker Rankings 2026 — Page ${page}`,
      description,
      url: canonical,
      type: 'website',
      images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: 'Forex Broker Rankings 2026 — BestForex.io directory' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: isFirstPage
        ? 'Forex Broker Rankings 2026'
        : `Forex Broker Rankings 2026 — Page ${page}`,
      description,
      images: [SITE_OG_IMAGE],
    },
    // T29: prev/next rel hints for crawlers — merged into one `other` object
    // so the second spread does not overwrite the first.
    other: {
      ...(page > 1 && {
        'link-prev': page === 2 ? BASE_URL : `${BASE_URL}?page=${page - 1}`,
      }),
      ...(page < TOTAL_PAGES && {
        'link-next': `${BASE_URL}?page=${page + 1}`,
      }),
    },
  }
}

export default async function ForexBrokersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const pageParam = params.page
  const searchQuery = (params.q ?? '').trim()
  const currentPage = Math.max(1, Math.min(Number(pageParam) || 1, TOTAL_PAGES))
  const offset = (currentPage - 1) * ITEMS_PER_PAGE
  const publicDirectory = await getRankedPublicDirectory()

  // When a search query is active, pass an empty initial slice so the server
  // renders no broker cards — the client will filter and render the correct
  // results after hydration, avoiding a visible flash of unfiltered content.
  const pageCompanies = searchQuery ? [] : publicDirectory.slice(offset, offset + ITEMS_PER_PAGE)

  const breadcrumbItems = [{ label: 'Forex Brokers' }]
  const stats = getDirectoryStats()
  const countries = getDirectoryCountries()
  const regulators = getDirectoryRegulators()
  const platforms = getDirectoryPlatforms()

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <ItemListSchema items={pageCompanies} startPosition={offset + 1} />
      {currentPage === 1 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(BROKERS_FAQ_SCHEMA) }}
        />
      )}

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-secondary/50 to-background py-10 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} className="mb-6" />

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-4">
                <Award className="w-4 h-4 mr-1.5 text-primary" />
                {`Updated ${LAST_UPDATED_LABEL}`}
              </Badge>
              <h1 className="text-3xl lg:text-5xl font-bold text-foreground text-balance">
                {currentPage === 1
                  ? 'Best Forex Brokers in 2026'
                  : `Best Forex Brokers in 2026 — Page ${currentPage}`}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Compare the best forex brokers in 2026, independently reviewed and ranked by our analysts.
                We assess {TOTAL_COMPANIES.toLocaleString()}+ regulated forex brokers, CFD platforms and prop
                trading firms across spreads, regulation, trading platforms, deposits and safety — so you can
                find the best forex broker for your strategy with confidence.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Link href="#directory">
                  <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto">
                    <TrendingUp className="w-5 h-5" />
                    Browse Directory
                  </Button>
                </Link>
                <Link href="/compare">
                  <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                    Compare Brokers
                  </Button>
                </Link>
              </div>
            </div>

            {/* B2B CTA Card */}
            <Card className="w-full lg:w-80 flex-shrink-0 border-primary/20 bg-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">For Brokers</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Want to list your broker or claim your existing profile? Contact us and our team will handle your request within one business day.
                </p>
                <div className="space-y-2">
                  <Link href="/contact-us?intent=claim" className="block">
                    <Button variant="default" size="sm" className="w-full gap-2 bg-primary hover:bg-primary/90">
                      <Building2 className="w-4 h-4" />
                      Claim or List Your Broker
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Directory Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              // P2-229: Use TOTAL_COMPANIES (retail entities shown in the listing) so this
              // stat matches the intro copy and the listing counter — one number everywhere.
              { icon: Award, label: 'Brokers Listed', value: `${TOTAL_COMPANIES.toLocaleString()}+` },
              { icon: Globe, label: 'Countries Covered', value: '50+' },
              { icon: Shield, label: 'Regulators Tracked', value: `${regulatorCount}+` },
              { icon: Database, label: 'Data Points', value: `${dataPointCount}+` }
            ].map((stat) => (
              <Card key={stat.label} className="bg-background/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Horizontal Banners */}
      <div className="bg-secondary/30 py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AdSlot placementKey="horizontal-1" fluid />
            <AdSlot placementKey="horizontal-2" fluid />
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <section id="directory" className="py-8 lg:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 items-start">

            {/* Main Directory Content */}
            <div className="flex-1 min-w-0">
              <DirectoryClient
                initialCompanies={pageCompanies}
                allCompanies={publicDirectory}
                countries={countries}
                regulators={regulators}
                platforms={platforms}
                currentPage={currentPage}
                totalPages={TOTAL_PAGES}
                itemsPerPage={ITEMS_PER_PAGE}
                totalResults={TOTAL_COMPANIES}
                serverSearchQuery={searchQuery}
              />
            </div>

            {/* Right Sidebar */}
            <aside className="hidden lg:flex flex-col gap-6 w-[300px] flex-shrink-0 sticky top-32 self-start">
              <AdSlot placementKey="square-1" />
              <AdSlot placementKey="square-2" />

              {/* Featured Listing CTA */}
              <Card className="overflow-hidden border border-border">
                <div className="bg-primary px-5 py-4">
                  <p className="text-sm font-semibold text-primary-foreground">Featured Listing</p>
                  <p className="text-xs text-primary-foreground/80 mt-1">
                    Get premium visibility in the directory
                  </p>
                </div>
                <CardContent className="p-5 space-y-3">
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Top placement in results
                    </li>
                    <li className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      Featured badge on profile
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Priority in search
                    </li>
                  </ul>
                  <Link href="/contact-us?intent=advertising" className="block">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-sm gap-2">
                      Grow Your Business
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/media-kit" className="block">
                    <Button variant="outline" className="w-full text-sm">
                      View Media Kit
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </aside>

          </div>
        </div>
      </section>

      {/* Bottom Horizontal Banners */}
      <div className="bg-secondary/20 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AdSlot placementKey="horizontal-1" fluid />
            <AdSlot placementKey="horizontal-2" fluid />
          </div>
        </div>
      </div>

      {/* Editorial / SEO content — only on the canonical first page */}
      {currentPage === 1 && (
        <section className="py-12">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <article className="prose prose-neutral max-w-none">
              <h2 className="text-2xl font-bold text-foreground">
                How We Choose the Best Forex Brokers
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Finding the best forex broker comes down to four things that matter most to traders:
                regulation and safety of funds, real all-in trading costs (spreads plus commissions),
                the quality and reliability of the trading platform, and the speed and fairness of
                deposits and withdrawals. Every broker in our directory is scored against {`>`}50 data
                points in these areas, and only brokers that meet our editorial data-quality bar are
                ranked and indexed — so the list you see reflects brokers we can actually stand behind.
              </p>
              <h2 className="mt-8 text-2xl font-bold text-foreground">
                What Makes a Good Forex Broker in 2026?
              </h2>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Regulation:</strong> oversight from tier-1
                  authorities such as the FCA, ASIC, CySEC or NFA, with segregated client funds.
                </li>
                <li>
                  <strong className="text-foreground">Low trading costs:</strong> tight spreads,
                  transparent commissions and no surprise fees on deposits or withdrawals.
                </li>
                <li>
                  <strong className="text-foreground">Strong platforms:</strong> stable access to
                  MetaTrader 4/5, cTrader or a proven proprietary platform with fast execution.
                </li>
                <li>
                  <strong className="text-foreground">Reliable funding:</strong> fast, low-friction
                  deposits and withdrawals via the payment methods you actually use.
                </li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Trading forex and CFDs carries a high risk of losing money rapidly due to leverage.
                Always check that a broker is authorised in your country before opening an account.
              </p>

              <h2 className="mt-10 text-2xl font-bold text-foreground">
                Best Forex Brokers — Frequently Asked Questions
              </h2>
              <div className="mt-4 space-y-6">
                {BROKERS_FAQ.map((faq) => (
                  <div key={faq.question}>
                    <h3 className="font-semibold text-foreground">{faq.question}</h3>
                    <p className="mt-1 text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-muted-foreground">
                Looking for a specific broker? Browse our complete{' '}
                <Link href="/brokers/all" className="text-primary font-medium hover:underline">
                  A-Z index of all forex brokers
                </Link>
                , or read how we rank them in our{' '}
                <Link href="/methodology" className="text-primary font-medium hover:underline">
                  review methodology
                </Link>
                .
              </p>
            </article>
          </div>
        </section>
      )}

      {/* Methodology Teaser */}
      <section className="py-12 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">How We Rate Brokers</h2>
                <p className="mt-2 text-muted-foreground max-w-2xl">
                  Our team of experienced traders and analysts evaluates each broker across 50+ criteria
                  including regulation, trading costs, platform quality, customer service, and more.
                </p>
              </div>
              <Link href="/methodology">
                <Button variant="outline" size="lg" className="flex-shrink-0">
                  View Methodology
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </>
  )
}
