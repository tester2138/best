import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, GraduationCap, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

// T56: noindex until content exists (same flag pattern as T53).
export const metadata: Metadata = {
  title: { absolute: `Learn Forex Trading | Education Hub | ${SITE_NAME}` },
  description: 'Forex and CFD trading education hub. Guides, glossary terms, and resources for traders of all levels.',
  alternates: { canonical: `${SITE_URL}/learn` },
  robots: { index: false, follow: true },
}

const UPCOMING_GUIDES = [
  { title: 'What is Forex Trading?', href: '#', comingSoon: true },
  { title: 'How to Choose a Forex Broker', href: '#', comingSoon: true },
  { title: 'Understanding Leverage and Margin', href: '#', comingSoon: true },
  { title: 'Forex Regulation Explained', href: '#', comingSoon: true },
]

export default function LearnPage() {
  const breadcrumbItems = [{ label: 'Learn' }]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="bg-secondary/30 border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, ...breadcrumbItems]} />
        </div>
      </div>

      <section className="border-b border-border py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            Learn Forex &amp; CFD Trading
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
            Educational guides and a trading glossary from the BestForex.io editorial team. Content
            publishing in stages — bookmark this page.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Guides section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Guides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {UPCOMING_GUIDES.map(guide => (
                <div key={guide.title} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{guide.title}</span>
                  {guide.comingSoon && (
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Glossary section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Glossary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Definitions for common forex and CFD trading terms, written for traders of all levels.
              </p>
              <Link
                href="/learn/glossary"
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse the glossary &rarr;
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
