import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import { getPublicEditorialContentEntries } from '@/lib/editorial-content'

export const revalidate = 300

async function getGlossaryEntries() {
  return Promise.all([
    getPublicEditorialContentEntries('learn_page'),
    getPublicEditorialContentEntries('glossary_term'),
  ])
}

export async function generateMetadata(): Promise<Metadata> {
  const [pages, terms] = await getGlossaryEntries()
  const glossary = pages.find((entry) => entry.slug === 'glossary')
  const hasDefinitions = terms.some((term) => term.status === 'published' && term.content.trim())
  const title = glossary?.metaTitle || `Forex Trading Glossary | ${SITE_NAME}`
  const description = glossary?.metaDescription || glossary?.summary || 'A glossary of forex and CFD trading terms explained in plain English.'
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/learn/glossary` },
    robots: { index: hasDefinitions || Boolean(glossary?.content.trim()), follow: true },
  }
}

export default async function GlossaryPage() {
  const [pages, terms] = await getGlossaryEntries()
  const glossary = pages.find((entry) => entry.slug === 'glossary')

  return (
    <>
      <BreadcrumbSchema items={[{ label: 'Learn', href: '/learn' }, { label: 'Glossary' }]} />
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Learn', href: '/learn' }, { label: 'Glossary' }]} />
        </div>
      </div>
      <main>
        <section className="border-b border-border py-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{glossary?.title ?? 'Forex Trading Glossary'}</h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{glossary?.summary || 'Plain-English definitions for common forex and CFD trading terms.'}</p>
            {glossary?.content.trim() ? <div className="prose prose-slate mt-6 max-w-3xl leading-relaxed dark:prose-invert" dangerouslySetInnerHTML={{ __html: glossary.content }} /> : null}
          </div>
        </section>
        <section className="mx-auto grid max-w-4xl gap-3 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:px-8" aria-label="Glossary terms">
          {terms.map((entry) => {
            const isReady = entry.status === 'published' && entry.content.trim().length > 0
            return (
              <Card key={entry.slug}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  {isReady ? <Link href={`/learn/glossary/${entry.slug}`} className="font-medium text-foreground hover:text-primary">{entry.title}</Link> : <span className="font-medium text-muted-foreground">{entry.title}</span>}
                  {!isReady ? <Badge variant="secondary">Coming soon</Badge> : null}
                </CardContent>
              </Card>
            )
          })}
          {terms.length === 0 ? <p className="text-sm text-muted-foreground">No glossary entries are available yet.</p> : null}
        </section>
      </main>
    </>
  )
}
