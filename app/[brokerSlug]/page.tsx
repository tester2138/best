import { permanentRedirect, notFound } from 'next/navigation'
import { resolveLegacyBrokerSlug } from '@/lib/public-brokers'

/**
 * Legacy redirect stub.
 *
 * Broker reviews moved from the site root (`/{slug}`) to the namespaced hub
 * (`/brokers/{slug}`) — see SEO audit #37/#38. This catch-all preserves link
 * equity by issuing a permanent (308) redirect for every brand that has a
 * live profile page. Static routes (/news, /offers, /brokers, ...) are matched
 * by Next.js before this dynamic segment, so there is no collision risk.
 * Unknown paths 404.
 *
 * Resolution mirrors the /brokers/{slug} page exactly: the full directory
 * catalogue (data/directory.ts) OR the legacy broker catalogue
 * (data/brokers.ts), checked statically with zero DB dependency so a Neon
 * outage can never turn a pure redirect into a 500. Uppercase, spaces and
 * percent-encoded variants (/Plus500, /PLUS500, /Plus%20500) all normalise to
 * the same canonical target.
 *
 * `dynamicParams` + empty `generateStaticParams` keeps this fully on-demand so
 * we don't pre-render thousands of redirect pages at build time.
 */
export const dynamicParams = true

// Fully dynamic at request time. Without this, Next.js treats the route as
// statically generatable (generateStaticParams is declared) and the runtime
// permanentRedirect() bails out with DYNAMIC_SERVER_USAGE — surfacing as a
// 500 in production only (dev never exercises the static-render path).
export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return []
}

export default async function LegacyBrokerRedirect({
  params,
}: {
  params: Promise<{ brokerSlug: string }>
}) {
  const { brokerSlug } = await params
  const canonicalSlug = await resolveLegacyBrokerSlug(brokerSlug)

  if (!canonicalSlug) {
    notFound()
  }

  permanentRedirect(`/brokers/${canonicalSlug}`)
}
