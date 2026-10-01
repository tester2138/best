import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import { getPublicEditorialContentEntries, getPublicEditorialContentEntry } from '@/lib/editorial-content'
import { stripToPlain } from '@/lib/sanitize'

export const revalidate = 300

type PageProps = { params: Promise<{ term: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { term } = await params
  const entry = await getPublicEditorialContentEntry('glossary_term', term)
  if (!entry) return { title: 'Glossary term not found', robots: { index: false, follow: false } }
  const hasDefinition = entry.status === 'published' && stripToPlain(entry.content).trim().length > 0
  const title = entry.metaTitle || `${entry.title} — Forex Glossary | ${SITE_NAME}`
  const description = entry.metaDescription || entry.summary || `Definition of ${entry.title} in forex and CFD trading.`
  const canonical = `${SITE_URL}/learn/glossary/${entry.slug}`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: { index: hasDefinition, follow: true },
    openGraph: { title, description, url: canonical, type: 'article' },
  }
}

export default async function GlossaryTermPage({ params }: PageProps) {
  const { term } = await params
  const [entry, relatedEntries] = await Promise.all([
    getPublicEditorialContentEntry('glossary_term', term),
    getPublicEditorialContentEntries('glossary_term'),
  ])
  if (!entry) notFound()
  const hasDefinition = entry.status === 'published' && stripToPlain(entry.content).trim().length > 0
  const relatedBySlug = new Map(relatedEntries.map((item) => [item.slug, item]))
  const breadcrumbItems = [
    { label: 'Learn', href: '/learn' },
    { label: 'Glossary', href: '/learn/glossary' },
    { label: entry.title },
  ]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, ...breadcrumbItems]} />
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-8">
          {!hasDefinition ? <Badge variant="secondary">Coming soon</Badge> : null}
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{entry.title}</h1>
          {entry.summary ? <p className="mt-4 leading-relaxed text-muted-foreground">{entry.summary}</p> : null}
        </header>
        <section className="py-8">
          {hasDefinition ? (
            <article className="prose prose-lg prose-slate max-w-none leading-relaxed dark:prose-invert" dangerouslySetInnerHTML={{ __html: entry.content }} />
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <p>A full definition for <strong className="text-foreground">{entry.title}</strong> is being prepared by the editorial team.</p>
              <p className="mt-3 text-sm"><Link href="/learn/glossary" className="text-primary hover:underline">Browse all glossary terms</Link></p>
            </CardContent></Card>
          )}
          {entry.relatedTerms.length ? (
            <div className="mt-10 border-t border-border pt-6">
              <h2 className="text-sm font-semibold text-foreground">Related terms</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {entry.relatedTerms.map((slug) => {
                  const related = relatedBySlug.get(slug)
                  return related ? <Link key={slug} href={`/learn/glossary/${slug}`} className="text-sm text-primary hover:underline">{related.title}</Link> : null
                })}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </>
  )
}
