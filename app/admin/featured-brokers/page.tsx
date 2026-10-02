import { requireAdminPage } from '@/lib/guards'
import {
  DEFAULT_HOMEPAGE_FEATURED_BROKER_SLUGS,
  getHomepageFeaturedBrokerOptions,
  getHomepageFeaturedBrokerSlugs,
} from '@/lib/homepage-featured-brokers'
import { FeaturedBrokersClient } from './featured-brokers-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Featured brokers · BestForex Admin' }

export default async function AdminFeaturedBrokersPage() {
  await requireAdminPage()

  const options = getHomepageFeaturedBrokerOptions()
  const configuredSlugs = await getHomepageFeaturedBrokerSlugs()
  const availableSlugs = new Set(options.map(({ slug }) => slug))
  const initialSlugs: [string, string] = [
    availableSlugs.has(configuredSlugs[0])
      ? configuredSlugs[0]
      : DEFAULT_HOMEPAGE_FEATURED_BROKER_SLUGS[0],
    availableSlugs.has(configuredSlugs[1])
      ? configuredSlugs[1]
      : DEFAULT_HOMEPAGE_FEATURED_BROKER_SLUGS[1],
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Homepage featured brokers</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Choose the two brands shown in the homepage&apos;s “Top-Rated Forex Brokers” section.
          The first choice appears on the left at desktop widths; the second appears on the right.
        </p>
      </div>
      <FeaturedBrokersClient options={options} initialSlugs={initialSlugs} />
    </div>
  )
}
