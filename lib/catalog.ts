import 'server-only'
import { directoryCompanies } from '@/data/directory'
import type { DirectoryCompany } from '@/lib/directory-types'
import type { SectionKey } from '@/lib/content/registry'

/**
 * Bridge between the editorial broker directory (data/directory.ts, ~1,800
 * records) and the portal `brands` table (Blueprint Section 8/17). Admins pick
 * a catalog entry in the AssignDialog; on assignment we snapshot editorial
 * defaults into the brand's draft/published sections so the broker starts with
 * their existing public profile instead of a blank page.
 */

export interface CatalogEntry {
  slug: string
  name: string
  website: string | null
  logoUrl: string | null
  headquarters: string | null
  regulators: string[]
  foundedYear: number | null
}

function toEntry(c: DirectoryCompany): CatalogEntry {
  return {
    slug: c.slug,
    name: c.name,
    website: c.websiteUrl ?? null,
    logoUrl: c.logoUrl ?? null,
    headquarters: c.headquarters ?? null,
    regulators: c.regulators ?? [],
    foundedYear: c.foundedYear ?? null,
  }
}

/**
 * Case-insensitive prefix/substring search over the directory, capped for the
 * combobox. Matches on name or slug. Empty query returns the first `limit`.
 */
export function searchCatalog(queryStr: string, limit = 20): CatalogEntry[] {
  const q = queryStr.trim().toLowerCase()
  const source = directoryCompanies
  if (!q) return source.slice(0, limit).map(toEntry)

  const scored: { c: DirectoryCompany; score: number }[] = []
  for (const c of source) {
    const name = c.name.toLowerCase()
    const slug = c.slug.toLowerCase()
    let score = -1
    if (name === q || slug === q) score = 0
    else if (name.startsWith(q) || slug.startsWith(q)) score = 1
    else if (name.includes(q) || slug.includes(q)) score = 2
    if (score >= 0) scored.push({ c, score })
  }
  scored.sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name))
  return scored.slice(0, limit).map((s) => toEntry(s.c))
}

/** Look up a single catalog entry by directory slug. */
export function getCatalogEntry(slug: string): CatalogEntry | null {
  const c = directoryCompanies.find((x) => x.slug === slug)
  return c ? toEntry(c) : null
}

/**
 * Build editorial default section content for a directory slug. Returned map is
 * keyed by SectionKey and holds plain JSON matching the section registry field
 * shapes. Only sections we can confidently seed from directory data are
 * populated; the rest stay empty so the broker fills them in. Every value is
 * later re-validated by lib/content/schema before it is persisted.
 */
export function getEditorialDefaults(slug: string): Partial<Record<SectionKey, Record<string, unknown>>> {
  const c = directoryCompanies.find((x) => x.slug === slug)
  if (!c) return {}

  const out: Partial<Record<SectionKey, Record<string, unknown>>> = {}

  // Registry field keys are canonical (lib/content/registry.ts). Anything that
  // fails schema validation at seed time is skipped, so only populate fields we
  // can satisfy (e.g. hero.short_description has min 40 / max 320).
  const hqCity = c.headquarters?.split(',')[0]?.trim()
  const short = (c.shortDescription ?? '').trim()

  // hero — short_description is required (min 40). Only seed when long enough.
  if (short.length >= 40) {
    out.hero = {
      short_description: short.slice(0, 320),
      ...(c.foundedYear ? { founded_year: c.foundedYear } : {}),
      ...(hqCity ? { hq_city: hqCity.slice(0, 60) } : {}),
    }
  }

  // about — body is rich text, required min 100 chars.
  const about = (c.longDescription ?? c.shortDescription ?? '').trim()
  if (about.length >= 100) {
    out.about = { body: about.slice(0, 3000) }
  }

  // pros_cons — needs >=2 pros and >=1 con to validate.
  const pros = (c.pros ?? []).map((p) => p.slice(0, 120)).slice(0, 8)
  const cons = (c.cons ?? []).map((p) => p.slice(0, 120)).slice(0, 8)
  if (pros.length >= 2 && cons.length >= 1) {
    out.pros_cons = { pros, cons }
  }

  // platforms — multiselect must use registry option labels; skip freeform.
  if (c.platforms && c.platforms.length) {
    out.platforms = { platform_note: c.platforms.slice(0, 6).join(', ').slice(0, 200) }
  }

  return out
}
