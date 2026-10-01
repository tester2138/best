import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import { getPublicEditorialContentEntry } from '@/lib/editorial-content'

export const revalidate = 300

async function getPolicy() {
  return getPublicEditorialContentEntry('corrections_policy', 'corrections-policy')
}

export async function generateMetadata(): Promise<Metadata> {
  const policy = await getPolicy()
  const title = policy?.metaTitle || `${policy?.title ?? 'Corrections Policy'} | ${SITE_NAME}`
  const description = policy?.metaDescription || policy?.summary || 'How to report an error to BestForex.io and how we issue and timestamp corrections to our articles.'
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/corrections` },
    openGraph: { title, description, url: `${SITE_URL}/corrections` },
  }
}

export default async function CorrectionsPage() {
  const policy = await getPolicy()
  if (!policy || policy.status !== 'published') notFound()

  return (
    <div className="bg-background">
      <BreadcrumbSchema items={[{ label: 'Corrections' }]} />
      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-4xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Corrections' }]} />
        </div>
      </div>
      <main>
        <header className="border-b border-border py-12 sm:py-16">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">{policy.title}</h1>
            {policy.summary ? <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">{policy.summary}</p> : null}
          </div>
        </header>
        <article className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="prose prose-lg prose-slate max-w-none leading-relaxed dark:prose-invert" dangerouslySetInnerHTML={{ __html: policy.content }} />
          <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            Contact the editorial team at{' '}
            <a href="mailto:editorial@bestforex.io" className="text-primary hover:underline">editorial@bestforex.io</a>
            {' '}or use our{' '}
            <Link href="/contact-us" className="text-primary hover:underline">contact form</Link>.
          </p>
        </article>
      </main>
    </div>
  )
}
