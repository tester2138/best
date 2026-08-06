import 'server-only'
import { unstable_cache } from 'next/cache'
import { query } from '@/lib/portal/db'
import type { SectionKey } from '@/lib/content/registry'

export type PublicSections = Partial<Record<SectionKey, Record<string, unknown>>>

async function loadPublicSections(slug: string): Promise<PublicSections> {
  // public_broker_sections is a VIEW filtered to is_claimed=true only.
  // Query broker_page_sections directly so unclaimed/bulk-imported brands
  // also get their sections loaded.
  const rows = await query<{ section_key: SectionKey; published: Record<string, unknown> }>(
    `SELECT s.section_key, s.published
       FROM public.broker_page_sections s
       JOIN public.brands b ON b.id = s.brand_id
      WHERE b.slug = $1 AND s.published IS NOT NULL`,
    [slug],
  )
  const sections: PublicSections = {}
  for (const row of rows) {
    sections[row.section_key] = row.published
  }
  return sections
}

export const getPublicSections = (slug: string) =>
  unstable_cache(
    () => loadPublicSections(slug),
    [`public-sections:${slug}`],
    // 60s TTL so new bulk imports appear quickly; busted immediately via
    // revalidateTag(`broker:${slug}`) called from the bulk-import route.
    { tags: [`broker:${slug}`], revalidate: 60 },
  )()
