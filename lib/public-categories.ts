import 'server-only'

import { cache } from 'react'
import { sql } from '@/lib/db'

export const STATIC_CATEGORY_LABELS: Record<string, string> = {
  news: 'News',
  opinion: 'Opinion',
  analysis: 'Analysis',
  education: 'Education',
  guide: 'Guides',
  review: 'Reviews',
}

export interface PublicCategory {
  slug: string
  name: string
  description: string
}

export const getPublicCategories = cache(async (): Promise<PublicCategory[]> => {
  const categories = new Map<string, PublicCategory>(
    Object.entries(STATIC_CATEGORY_LABELS).map(([slug, name]) => [slug, { slug, name, description: '' }]),
  )

  try {
    const rows = await sql`
      SELECT slug, name, description
      FROM public.categories
      ORDER BY name ASC, slug ASC
    `
    for (const row of rows) {
      const slug = String(row.slug ?? '')
      const name = String(row.name ?? '').trim()
      if (!slug || !name) continue
      categories.set(slug, {
        slug,
        name,
        description: String(row.description ?? ''),
      })
    }
  } catch {
    return [...categories.values()]
  }

  return [...categories.values()].sort((a, b) => {
    const aIndex = Object.keys(STATIC_CATEGORY_LABELS).indexOf(a.slug)
    const bIndex = Object.keys(STATIC_CATEGORY_LABELS).indexOf(b.slug)
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      if (aIndex !== bIndex) return aIndex - bIndex
    }
    return a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug)
  })
})

export async function getPublicCategoryLabel(slug: string): Promise<string> {
  const category = (await getPublicCategories()).find((entry) => entry.slug === slug)
  if (category) return category.name
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
