import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, GraduationCap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import { getPublicEditorialContentEntries } from '@/lib/editorial-content'

export const revalidate = 300

async function getLearnEntries() {
  return getPublicEditorialContentEntries('learn_page')
}

export async function generateMetadata(): Promise<Metadata> {
  const entries = await getLearnEntries()
  const landing = entries.find((entry) => entry.slug === 'index')
  const hasPublishedGuide = entries.some((entry) => entry.slug !== 'index' && entry.slug !== 'glossary' && entry.status === 'published' && entry.content.trim())
  const hasContent = Boolean(landing?.content.trim() || hasPublishedGuide)
  const title = landing?.metaTitle || `Learn Forex Trading | Education Hub | ${SITE_NAME}`
  const description = landing?.metaDescription || landing?.summary || 'Forex and CFD trading education hub. Guides, glossary terms, and resources for traders of all levels.'

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/learn` },
    robots: { index: hasContent, follow: true },
  }
}

export default async function LearnPage() {
  const entries = await getLearnEntries()
  const landing = entries.find((entry) => entry.slug === 'index')
  const glossary = entries.find((entry) => entry.slug === 'glossary')
  const guides = entries.filter((entry) => !['index', 'glossary'].includes(entry.slug))
  const glossaryTerms = await getPublicEditorialContentEntries('glossary_term')

  return (
    <>
      <BreadcrumbSchema items={[{ label: 'Learn' }]} />
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Learn' }]} />
        </div>
      </div>
      <main>
        <section className="border-b border-border py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{landing?.title ?? 'Learn Forex & CFD Trading'}</h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              {landing?.summary || 'Educational guides and a trading glossary from the BestForex.io editorial team.'}
            </p>
            {landing?.content.trim() ? (
              <div className="prose prose-slate mt-6 max-w-3xl leading-relaxed dark:prose-invert" dangerouslySetInnerHTML={{ __html: landing.content }} />
            ) : null}
          </div>
        </section>
        <section className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GraduationCap aria-hidden="true" />Guides</CardTitle>
              <CardDescription>Practical explainers from the editorial team.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {guides.map((guide) => {
                const isReady = guide.status === 'published' && guide.content.trim().length > 0
                return (
                  <div key={guide.slug} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
                    {isReady ? <Link href={`/learn/${guide.slug}`} className="font-medium text-foreground hover:text-primary">{guide.title}</Link> : <span className="font-medium text-muted-foreground">{guide.title}</span>}
                    {!isReady ? <Badge variant="secondary">Coming soon</Badge> : null}
                  </div>
                )
              })}
              {guides.length === 0 ? <p className="text-sm text-muted-foreground">New guides are being prepared.</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen aria-hidden="true" />Glossary</CardTitle>
              <CardDescription>{glossary?.summary || 'Plain-English definitions for common forex and CFD trading terms.'}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {glossary?.content.trim() ? <div className="prose prose-slate max-w-none text-sm leading-relaxed dark:prose-invert" dangerouslySetInnerHTML={{ __html: glossary.content }} /> : null}
              <p className="text-sm text-muted-foreground">{glossaryTerms.filter((term) => term.status === 'published' && term.content.trim()).length} definitions published</p>
              <Link href="/learn/glossary" className="text-sm font-medium text-primary hover:underline">Browse the glossary</Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  )
}
