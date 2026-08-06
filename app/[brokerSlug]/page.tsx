import { permanentRedirect, notFound } from 'next/navigation'
import { getCompanyBySlug } from '@/data/directory'

/**
 * Legacy redirect stub.
 *
 * Broker reviews moved from the site root (`/{slug}`) to the namespaced hub
 * (`/brokers/{slug}`) — see SEO audit #37/#38. This catch-all preserves link
 * equity by issuing a permanent (308) redirect for every known broker slug.
 * Static routes (/news, /offers, /brokers, ...) are matched by Next.js before
 * this dynamic segment, so there is no collision risk. Unknown paths 404.
 *
 * `dynamicParams` + empty `generateStaticParams` keeps this fully on-demand so
 * we don't pre-render thousands of redirect pages at build time.
 */
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

export default async function LegacyBrokerRedirect({
  params,
}: {
  params: Promise<{ brokerSlug: string }>
}) {
  const { brokerSlug } = await params
  // Normalise to lowercase so /Plus500, /PLUS500, /plus500 all redirect to the
  // same canonical URL at /brokers/plus500.
  const normalisedSlug = brokerSlug.toLowerCase()
  const company = getCompanyBySlug(normalisedSlug)

  if (!company) {
    notFound()
  }

  permanentRedirect(`/brokers/${normalisedSlug}`)
}
