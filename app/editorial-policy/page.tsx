import type { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

const title = `Editorial Policy — Sourcing, Fact-Checking & Independence`
const description =
  'How BestForex.io researches, sources and fact-checks its journalism, how opinion is labelled, and our disclosure on editorial pen names.'

export const metadata: Metadata = {
  title: { absolute: `${title} | ${SITE_NAME}` },
  description,
  alternates: { canonical: `${SITE_URL}/editorial-policy` },
  openGraph: { title, description, url: `${SITE_URL}/editorial-policy` },
}

export default function EditorialPolicyPage() {
  return (
    <div className="bg-background">
      <BreadcrumbSchema items={[{ label: 'Editorial Policy' }]} />

      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-4xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Editorial Policy' }]} />
        </div>
      </div>

      <section className="border-b border-border py-12 sm:py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Editorial Policy
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            How our journalism is researched, sourced and verified — and how we separate fact from
            opinion.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-foreground">How We Research &amp; Source</h2>
          <p className="mt-4 text-foreground leading-relaxed">
            Our articles are built on primary sources wherever possible: regulatory filings and
            enforcement notices, company announcements and financial statements, official broker
            documentation, and reporting from established financial media. Factual claims are
            attributed, and each article carries a source note identifying the material it draws on.
            We distinguish clearly between what is on the public record and our interpretation of it.
          </p>
        </section>

        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground">Fact-Checking</h2>
          <p className="mt-4 text-foreground leading-relaxed">
            Before publication, articles are checked against their underlying sources to confirm that
            names, dates, figures, regulatory references and quotations are accurate. Where a claim
            cannot be substantiated, it is removed or clearly framed as unverified. When the facts
            change after publication, we update the article and, where the change is material, note it
            transparently via our{' '}
            <Link href="/corrections" className="text-primary hover:underline">
              corrections process
            </Link>
            .
          </p>
        </section>

        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground">Opinion Is Clearly Labelled</h2>
          <p className="mt-4 text-foreground leading-relaxed">
            A large part of our coverage is editorial commentary — sharp, critical and unapologetically
            opinionated. We never present opinion as straight news. Every column is badged{' '}
            <span className="font-semibold text-foreground">&ldquo;Opinion&rdquo;</span> or{' '}
            <span className="font-semibold text-foreground">&ldquo;Analysis&rdquo;</span> near the top
            of the article and in our listings, so readers always know whether they are reading
            reporting or argument. Opinion pieces represent fair comment based on disclosed facts and
            are not financial advice.
          </p>
        </section>

        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground">Editorial Pen Names</h2>
          <Card className="mt-4 border-primary/20 bg-primary/5 p-6">
            <p className="text-foreground leading-relaxed">
              BestForex.io editorial columns are published under consistent editorial pen names
              representing our in-house critic desk.
            </p>
          </Card>
          <p className="mt-4 text-foreground leading-relaxed">
            Each pen name represents a consistent editorial voice and area of focus, and the same name
            is used reliably for the same beat. Using consistent bylines for an opinion desk is a long
            established practice in journalism. Accountability for all published content rests with
            BestForex.io as publisher. You can see each contributor and their work on our{' '}
            <Link href="/news/author" className="text-primary hover:underline">
              editorial team page
            </Link>
            .
          </p>
        </section>

        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground">Independence &amp; Conflicts</h2>
          <p className="mt-4 text-foreground leading-relaxed">
            We do not accept payment from brokers for favourable coverage. Some links are affiliate
            links and may earn us a commission, but commercial relationships never determine our
            ratings, rankings or editorial conclusions. Where a piece touches a broker we have a
            commercial relationship with, that does not soften our scrutiny. Read more about our model
            on the{' '}
            <Link href="/about" className="text-primary hover:underline">
              about page
            </Link>{' '}
            and our scoring on the{' '}
            <Link href="/methodology" className="text-primary hover:underline">
              methodology page
            </Link>
            .
          </p>
        </section>

        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground">Contact the Editorial Desk</h2>
          <p className="mt-4 text-foreground leading-relaxed">
            Questions about our journalism, or a correction to request? Email{' '}
            <a href="mailto:editorial@bestforex.io" className="text-primary hover:underline">
              editorial@bestforex.io
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
