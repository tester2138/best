import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, FileText, RotateCcw, DollarSign, Newspaper } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

export const metadata: Metadata = {
  title: { absolute: `Why Trust BestForex.io | Our Editorial Standards | ${SITE_NAME}` },
  description:
    'How BestForex.io researches and rates forex brokers, our editorial independence principles, how we make money, and how to report corrections.',
  alternates: { canonical: `${SITE_URL}/why-trust-us` },
  openGraph: {
    title: `Why Trust BestForex.io`,
    description:
      'How BestForex.io researches and rates forex brokers, our editorial independence principles, how we make money, and how to report corrections.',
    url: `${SITE_URL}/why-trust-us`,
    type: 'website',
  },
}

const sections = [
  {
    icon: Shield,
    title: 'Our Methodology',
    body: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          Every broker in our directory is evaluated against a consistent, multi-point framework covering
          regulatory standing, trading conditions, platform quality, customer service, and transparency.
          Reviewed profiles receive a numerical score across seven sub-categories; the overall rating is a
          weighted composite of those scores, not a single editorial impression.
        </p>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          We distinguish between three data quality tiers:{' '}
          <strong className="text-foreground">basic</strong> (name, category, website — not indexed),{' '}
          <strong className="text-foreground">enriched</strong> (conditions, platforms, regulators — not indexed),
          and{' '}
          <strong className="text-foreground">reviewed</strong> (full editorial assessment — indexed).
          Only reviewed profiles are submitted to search engines.
        </p>
        <Link
          href="/methodology"
          className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
        >
          Read our full methodology &rarr;
        </Link>
      </>
    ),
  },
  {
    icon: FileText,
    title: 'Editorial Independence',
    body: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          BestForex.io maintains a strict separation between editorial and commercial teams. Sponsorship,
          featured placement, and affiliate relationships have no influence on our scores, rankings, or
          review conclusions. A broker cannot buy a higher rating, and we will not lower a rating in response
          to a commercial dispute.
        </p>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Our editorial team operates under the principles described in our{' '}
          <Link href="/editorial-policy" className="text-primary hover:underline">
            Editorial Policy
          </Link>
          . All opinion and analysis pieces are clearly labelled with an editorial-type badge (News, Analysis,
          or Opinion) so readers can distinguish straight reporting from commentary.
        </p>
        <Link
          href="/editorial-policy"
          className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
        >
          Read our editorial policy &rarr;
        </Link>
      </>
    ),
  },
  {
    icon: RotateCcw,
    title: 'Corrections Process',
    body: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          We are committed to factual accuracy. If you identify an error in a review, article, or data point,
          please contact us at{' '}
          <a href="mailto:editorial@bestforex.io" className="text-primary hover:underline">
            editorial@bestforex.io
          </a>
          . We investigate every submission and publish a correction notice on the affected page when a
          factual error is confirmed. We do not silently remove or alter content to avoid accountability.
        </p>
        <Link
          href="/corrections"
          className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
        >
          View our corrections page &rarr;
        </Link>
      </>
    ),
  },
  {
    icon: DollarSign,
    title: 'How We Make Money',
    body: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          BestForex.io earns revenue through three channels: affiliate commissions (when a trader opens an
          account through a link on our site), paid featured listings (premium placement in search results
          and comparison tables), and direct advertising (banner inventory). None of these arrangements
          affect editorial scores, rankings, or news coverage.
        </p>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          All affiliate and sponsored links are labelled. The footer of every page carries our standard
          affiliate disclosure. We follow the FTC guidelines on endorsement and disclosure.
        </p>
      </>
    ),
  },
  {
    icon: Newspaper,
    title: 'Press Mentions',
    body: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          Press mentions and media references will be listed here as BestForex.io grows its public profile.
          For press enquiries contact{' '}
          <a href="mailto:info@bestforex.io" className="text-primary hover:underline">
            info@bestforex.io
          </a>
          .
        </p>
      </>
    ),
  },
]

export default function WhyTrustUsPage() {
  const breadcrumbItems = [{ label: 'Why Trust Us' }]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="bg-secondary/30 border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, ...breadcrumbItems]} />
        </div>
      </div>

      <section className="border-b border-border py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            Why Trust BestForex.io
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            We are an independent editorial team. This page explains how we research brokers, how we stay
            independent from commercial interests, and how we handle corrections.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </span>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>{section.body}</CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
