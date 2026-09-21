import 'server-only'

import { revalidatePath } from 'next/cache'

/**
 * Invalidate every public News surface after an article is created, updated,
 * or seeded. This keeps ISR output, XML discovery files, and feed readers
 * aligned with the database instead of waiting for their TTLs.
 */
export function revalidateNewsSurfaces(slug?: string): void {
  revalidatePath('/news')
  revalidatePath('/news/[slug]', 'page')
  revalidatePath('/news/category/[category]', 'page')
  revalidatePath('/news/author', 'page')
  revalidatePath('/news/author/[slug]', 'page')
  revalidatePath('/news-sitemap.xml')
  revalidatePath('/news/feed.xml')
  revalidatePath('/sitemap.xml')

  if (slug) {
    revalidatePath(`/news/${slug}`)
  }
}
