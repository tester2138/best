import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

// T56: noindex until content is populated.
export const metadata: Metadata = {
  title: { absolute: `Forex Trading Glossary | ${SITE_NAME}` },
  description: 'A glossary of forex and CFD trading terms explained in plain English.',
  alternates: { canonical: `${SITE_URL}/learn/glossary` },
  robots: { index: false, follow: true },
}

// Seed terms — expand as copy is added. comingSoon = true suppresses the link.
export const GLOSSARY_TERMS = [
  { term: 'Spread', slug: 'spread', comingSoon: true },
  { term: 'Leverage', slug: 'leverage', comingSoon: true },
  { term: 'Margin', slug: 'margin', comingSoon: true },
  { term: 'Pip', slug: 'pip', comingSoon: true },
  { term: 'CFD', slug: 'cfd', comingSoon: true },
  { term: 'ECN Broker', slug: 'ecn-broker', comingSoon: true },
  { term: 'Market Maker', slug: 'market-maker', comingSoon: true },
  { term: 'Stop Loss', slug: 'stop-loss', comingSoon: true },
  { term: 'Take Profit', slug: 'take-profit', comingSoon: true },
  { term: 'Drawdown', slug: 'drawdown', comingSoon: true },
]

export default function GlossaryPage() {
  const breadcrumbItems = [
    { label: 'Learn', href: '/learn' },
    { label: 'Glossary' },
  ]

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
            Forex Trading Glossary
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">
            Plain-English definitions for common forex and CFD trading terms. Publishing in stages.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid sm:grid-cols-2 gap-3">
          {GLOSSARY_TERMS.map(item => (
            <div key={item.slug} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
              {item.comingSoon ? (
                <span className="font-medium text-muted-foreground">{item.term}</span>
              ) : (
                <Link
                  href={`/learn/glossary/${item.slug}`}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {item.term}
                </Link>
              )}
              {item.comingSoon && (
                <Badge variant="secondary" className="text-xs">Coming soon</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
