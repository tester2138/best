import { SITE_URL } from '@/lib/site-config'

interface ItemListEntry {
  slug: string
  name: string
}

/**
 * Emits an ItemList of brokers for the directory hub so search engines
 * understand the page is a ranked collection. `startPosition` keeps the
 * positions globally correct across paginated pages.
 */
export function ItemListSchema({
  items,
  startPosition = 1,
}: {
  items: ItemListEntry[]
  startPosition?: number
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: startPosition + idx,
      url: `${SITE_URL}/brokers/${item.slug}`,
      name: item.name,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
