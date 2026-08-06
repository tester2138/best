import type { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

const title = `Corrections Policy — Reporting & Fixing Errors`
const description =
  'How to report an error to BestForex.io and how we issue and timestamp corrections to our articles.'

export const metadata: Metadata = {
  title: { absolute: `${title} | ${SITE_NAME}` },
  description,
  alternates: { canonical: `${SITE_URL}/corrections` },
  openGraph: { title, description, url: `${SITE_URL}/corrections` },
}

const steps = [
  {
    step: 1,
    title: 'Report it',
    description:
      'Email editorial@bestforex.io with the article URL, the specific passage you believe is wrong, and any supporting source. The more precise the detail, the faster we can act.',
  },
  {
    step: 2,
    title: 'We review',
    description:
      'An editor checks the claim against the original sources and any new evidence you provide. We aim to acknowledge correction requests promptly and investigate without delay.',
  },
  {
    step: 3,
    title: 'We fix and disclose',
    description:
      'If a material error is confirmed, we update the article and add a dated correction note explaining what changed. Minor typos are fixed silently; substantive changes are always disclosed.',
  },
  {
    step: 4,
    title: 'We timestamp',
    description:
      'Corrected articles show an updated modification date, and the correction note records the date the change was made so the record is transparent.',
  },
]

export default function CorrectionsPage() {
  return (
    <div className="bg-background">
      <BreadcrumbSchema items={[{ label: 'Corrections' }]} />

      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-4xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Corrections' }]} />
        </div>
      </div>

      <section className="border-b border-border py-12 sm:py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Corrections Policy
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Accuracy matters. Here is how to flag an error and how we put it right.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Our Commitment</h2>
          <p className="mt-4 text-foreground leading-relaxed">
            We work hard to get things right, but no publisher is infallible. When we make a factual
            error, we correct it openly and promptly rather than quietly burying it. This page explains
            how readers can report problems and what happens next.
          </p>
        </section>

        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground">How Corrections Work</h2>
          <div className="mt-8 space-y-4">
            {steps.map((s) => (
              <Card key={s.step} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border pt-12">
          <Card className="border-primary/20 bg-primary/5 p-6">
            <h2 className="text-xl font-bold text-foreground">Report an Error</h2>
            <p className="mt-3 text-foreground leading-relaxed">
              Email{' '}
              <a href="mailto:editorial@bestforex.io" className="text-primary hover:underline font-medium">
                editorial@bestforex.io
              </a>{' '}
              with the article link and the detail you want reviewed, or use our{' '}
              <Link href="/contact-us" className="text-primary hover:underline">
                contact form
              </Link>
              . For more on how we source and verify our work, see our{' '}
              <Link href="/editorial-policy" className="text-primary hover:underline">
                editorial policy
              </Link>
              .
            </p>
          </Card>
        </section>
      </div>
    </div>
  )
}
