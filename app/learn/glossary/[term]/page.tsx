import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import { GLOSSARY_TERMS } from '../page'

interface PageProps {
  params: Promise<{ term: string }>
}

// T56: all term pages noindex until Kerem adds definition copy.
// Flip the indexable flag per term when copy is provided.
const INDEXABLE_TERMS: string[] = []

// Term definitions — add `definition` and flip comingSoon=false when ready.
type GlossaryEntry = {
  term: string
  slug: string
  comingSoon: boolean
  definition?: string
  relatedTerms?: string[]
}

const GLOSSARY_ENTRIES: GlossaryEntry[] = GLOSSARY_TERMS.map(t => ({
  ...t,
  definition: undefined,
  relatedTerms: [],
}))

export function generateStaticParams() {
  return GLOSSARY_ENTRIES.map(e => ({ term: e.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { term } = await params
  const entry = GLOSSARY_ENTRIES.find(e => e.slug === term)
  if (!entry) return { title: 'Not Found' }

  const isIndexable = INDEXABLE_TERMS.includes(term)
  const title = `${entry.term} — Forex Glossary | ${SITE_NAME}`
  const description = entry.definition
    ? `${entry.definition.slice(0, 155)}...`
    : `Definition of ${entry.term} in forex and CFD trading.`
  const url = `${SITE_URL}/learn/glossary/${term}`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    ...(isIndexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, url, type: 'article' },
  }
}

export default async function GlossaryTermPage({ params }: PageProps) {
  const { term } = await params
  const entry = GLOSSARY_ENTRIES.find(e => e.slug === term)
  if (!entry) notFound()

  const breadcrumbItems = [
    { label: 'Learn', href: '/learn' },
    { label: 'Glossary', href: '/learn/glossary' },
    { label: entry.term },
  ]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="bg-secondary/30 border-b border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, ...breadcrumbItems]} />
        </div>
      </div>

      <section className="border-b border-border py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            {entry.term}
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        {entry.definition ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-foreground leading-relaxed">{entry.definition}</p>
              {entry.relatedTerms && entry.relatedTerms.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Related terms</p>
                  <div className="flex flex-wrap gap-2">
                    {entry.relatedTerms.map(slug => {
                      const related = GLOSSARY_ENTRIES.find(e => e.slug === slug)
                      return related ? (
                        <Link
                          key={slug}
                          href={`/learn/glossary/${slug}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {related.term}
                        </Link>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p className="text-base">
                A full definition for <strong className="text-foreground">{entry.term}</strong> is being
                written by our editorial team.
              </p>
              <p className="mt-2 text-sm">Check back soon, or{' '}
                <Link href="/learn/glossary" className="text-primary hover:underline">
                  browse all glossary terms
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
