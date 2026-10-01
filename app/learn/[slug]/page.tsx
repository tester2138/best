import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import { getPublicEditorialContentEntry, getPublicEditorialContentEntries } from '@/lib/editorial-content'
import { stripToPlain } from '@/lib/sanitize'

export const revalidate = 300

type PageProps = { params: Promise<{ slug: string }> }

async function getGuide(slug: string) {
  if (slug === 'index' || slug === 'glossary') return undefined
  return getPublicEditorialContentEntry('learn_page', slug)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const entry = await getGuide(slug)
  if (!entry) return { title: 'Guide not found', robots: { index: false, follow: false } }
  const hasContent = entry.status === 'published' && stripToPlain(entry.content).trim().length > 0
  const title = entry.metaTitle || `${entry.title} | ${SITE_NAME}`
  const description = entry.metaDescription || entry.summary || `Read the BestForex.io guide to ${entry.title.toLowerCase()}.`
  const canonical = `${SITE_URL}/learn/${entry.slug}`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: { index: hasContent, follow: true },
    openGraph: { title, description, url: canonical, type: 'article' },
  }
}

export default async function LearnGuidePage({ params }: PageProps) {
  const { slug } = await params
  const [entry, glossaryEntries] = await Promise.all([
    getGuide(slug),
    getPublicEditorialContentEntries('glossary_term'),
  ])
  if (!entry) notFound()
  const hasContent = entry.status === 'published' && stripToPlain(entry.content).trim().length > 0
  const termBySlug = new Map(glossaryEntries.map((term) => [term.slug, term]))
  const breadcrumbItems = [{ label: 'Learn', href: '/learn' }, { label: entry.title }]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, ...breadcrumbItems]} />
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-8">
          {!hasContent ? <Badge variant="secondary">Coming soon</Badge> : null}
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{entry.title}</h1>
          {entry.summary ? <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{entry.summary}</p> : null}
        </header>
        <article className="py-8">
          {hasContent ? (
            <div className="prose prose-lg prose-slate max-w-none leading-relaxed dark:prose-invert" dangerouslySetInnerHTML={{ __html: entry.content }} />
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">This guide is being prepared by the editorial team. Please check back soon.</CardContent></Card>
          )}
        </article>
        {entry.relatedTerms.length ? (
          <section className="border-t border-border pt-6">
            <h2 className="text-sm font-semibold">Related terms</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {entry.relatedTerms.map((termSlug) => {
                const term = termBySlug.get(termSlug)
                return term ? <Link key={termSlug} href={`/learn/glossary/${termSlug}`} className="text-sm text-primary hover:underline">{term.title}</Link> : null
              })}
            </div>
          </section>
        ) : null}
      </main>
    </>
  )
}
