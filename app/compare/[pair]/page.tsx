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
import { getCompanyBySlug, directoryCompanies } from '@/data/directory'
import { SITE_URL } from '@/lib/site-config'
import { isRetailEntityType } from '@/lib/directory-types'
import type { DirectoryCompany } from '@/lib/directory-types'

interface PageProps {
  params: Promise<{ pair: string }>
}

// T53: noindex by default; set indexable when Kerem adds intro copy.
const INDEXABLE_PAIRS: string[] = []

// Top pairs for static generation — expand as needed.
const STATIC_PAIRS = [
  'plus500-vs-etoro',
  'pepperstone-vs-ic-markets',
  'ig-vs-saxo-bank',
]

function parsePair(pair: string): { slugA: string; slugB: string } | null {
  const idx = pair.indexOf('-vs-')
  if (idx === -1) return null
  return {
    slugA: pair.slice(0, idx),
    slugB: pair.slice(idx + 4),
  }
}

export function generateStaticParams() {
  return STATIC_PAIRS.map(pair => ({ pair }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pair } = await params
  const parsed = parsePair(pair)
  if (!parsed) return { title: 'Not Found' }

  const a = getCompanyBySlug(parsed.slugA)
  const b = getCompanyBySlug(parsed.slugB)
  if (!a || !b) return { title: 'Not Found' }

  const isIndexable = INDEXABLE_PAIRS.includes(pair)
  const title = `${a.name} vs ${b.name} — Side-by-Side Comparison | BestForex.io`
  const description = `Compare ${a.name} and ${b.name} side by side: ratings, fees, platforms, regulation, and trading conditions.`
  const url = `${SITE_URL}/compare/${pair}`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    ...(isIndexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, url, type: 'website' },
  }
}

// ─── Comparison row helper ────────────────────────────────────────────────────

type Row = {
  label: string
  a: string | null
  b: string | null
}

function buildRows(a: DirectoryCompany, b: DirectoryCompany): Row[] {
  return [
    { label: 'Rating', a: a.rating?.toFixed(1) ?? '—', b: b.rating?.toFixed(1) ?? '—' },
    { label: 'Min Deposit', a: a.minDeposit ?? '—', b: b.minDeposit ?? '—' },
    { label: 'Spreads From', a: a.spreadsFrom ?? '—', b: b.spreadsFrom ?? '—' },
    { label: 'Commission', a: a.commissions ?? 'None', b: b.commissions ?? 'None' },
    { label: 'Max Leverage (Retail)', a: a.maxLeverageRetail ?? '—', b: b.maxLeverageRetail ?? '—' },
    { label: 'Platforms', a: a.platforms?.join(', ') ?? '—', b: b.platforms?.join(', ') ?? '—' },
    { label: 'Regulators', a: a.regulators?.join(', ') ?? '—', b: b.regulators?.join(', ') ?? '—' },
    { label: 'Founded', a: a.foundedYear?.toString() ?? '—', b: b.foundedYear?.toString() ?? '—' },
    { label: 'Headquarters', a: a.headquarters ?? a.country ?? '—', b: b.headquarters ?? b.country ?? '—' },
    { label: 'Withdrawal Time', a: a.withdrawalTime ?? '—', b: b.withdrawalTime ?? '—' },
  ]
}

export default async function ComparePairPage({ params }: PageProps) {
  const { pair } = await params
  const parsed = parsePair(pair)
  if (!parsed) notFound()

  const a = getCompanyBySlug(parsed.slugA)
  const b = getCompanyBySlug(parsed.slugB)
  if (!a || !b) notFound()

  const rows = buildRows(a, b)

  const breadcrumbItems = [
    { label: 'Compare Brokers', href: '/compare' },
    { label: `${a.name} vs ${b.name}` },
  ]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="bg-secondary/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      <section className="border-b border-border py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            {a.name} vs {b.name}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Side-by-side comparison of {a.name} and {b.name} across ratings, fees, platforms, and regulation.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header cards */}
        <div className="grid grid-cols-2 gap-4">
          {[a, b].map(broker => (
            <Card key={broker.id}>
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <BrokerLogo name={broker.name} slug={broker.slug} logoUrl={broker.logoUrl} size="lg" />
                <div>
                  <h2 className="font-semibold text-foreground">{broker.name}</h2>
                  {broker.rating && (
                    <div className="flex justify-center mt-1">
                      <RatingStars rating={broker.rating} size="sm" showLabel />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {broker.shortDescription}
                  </p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  {broker.affiliateUrl && (
                    <OutLink href={broker.affiliateUrl} sponsored>
                      <Button size="sm" className="w-full">Visit Broker</Button>
                    </OutLink>
                  )}
                  <Link
                    href={`/brokers/${broker.slug}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Full Review
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison table */}
        <Card>
          <CardHeader>
            <CardTitle>Side-by-Side Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-1/3">Feature</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">{a.name}</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">{b.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{row.label}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.a ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.b ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pros / Cons comparison */}
        {(a.pros?.length || b.pros?.length) && (
          <div className="grid grid-cols-2 gap-4">
            {[a, b].map(broker => (
              <Card key={broker.id}>
                <CardHeader>
                  <CardTitle className="text-base">{broker.name} Pros &amp; Cons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {broker.pros && broker.pros.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-success mb-2 uppercase tracking-wide">Pros</p>
                      <ul className="space-y-1">
                        {broker.pros.map((p, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-success mt-0.5">+</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {broker.cons && broker.cons.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-destructive mb-2 uppercase tracking-wide">Cons</p>
                      <ul className="space-y-1">
                        {broker.cons.map((c, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-destructive mt-0.5">−</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
