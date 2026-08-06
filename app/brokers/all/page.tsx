import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { getPublicDirectoryCompanies } from '@/lib/public-brokers'
import { isIndexableBroker } from '@/lib/seo'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

const title = `All Forex Brokers — A-Z Index | ${SITE_NAME}`
const description =
  'Browse the complete A-Z index of every reviewed forex broker and CFD platform on BestForex.io. Jump straight to any broker profile, regulation details and rating.'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/brokers/all` },
  openGraph: { title, description, url: `${SITE_URL}/brokers/all` },
}

export default async function AllBrokersPage() {
  const directoryCompanies = await getPublicDirectoryCompanies()
  // Only quality (indexable) profiles, sorted alphabetically.
  const brokers = directoryCompanies
    .filter(isIndexableBroker)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  // Group by first character (digits/symbols bucket under "#").
  const groups = new Map<string, typeof brokers>()
  for (const broker of brokers) {
    const first = broker.name.trim().charAt(0).toUpperCase()
    const key = /[A-Z]/.test(first) ? first : '#'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(broker)
  }
  const letters = Array.from(groups.keys()).sort()

  return (
    <div className="bg-background">
      <BreadcrumbSchema items={[{ label: 'Brokers', href: '/brokers' }, { label: 'A-Z Index' }]} />

      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={[{ label: 'Brokers', href: '/brokers' }, { label: 'A-Z Index' }]} />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <header className="max-w-2xl">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground text-balance">
            All Forex Brokers: A-Z Index
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            The complete alphabetical index of every broker we review. Browse {brokers.length}{' '}
            reviewed forex brokers and CFD platforms, or jump to a letter below.
          </p>
        </header>

        {/* Letter jump nav */}
        <nav aria-label="Jump to letter" className="mt-8 flex flex-wrap gap-2">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {letter}
            </a>
          ))}
        </nav>

        {/* Grouped lists */}
        <div className="mt-10 space-y-10">
          {letters.map((letter) => (
            <section key={letter} id={`letter-${letter}`} aria-labelledby={`heading-${letter}`} className="scroll-mt-24">
              <h2 id={`heading-${letter}`} className="text-xl font-bold text-primary border-b border-border pb-2">
                {letter}
              </h2>
              <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {groups.get(letter)!.map((broker) => (
                  <li key={broker.slug}>
                    <Link
                      href={`/brokers/${broker.slug}`}
                      className="text-sm text-foreground hover:text-primary hover:underline"
                    >
                      {broker.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
