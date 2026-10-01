import 'server-only'

import { cache } from 'react'
import { sql } from '@/lib/db'
import { sanitizeEditorialHtml } from '@/lib/sanitize'
import type { Author } from '@/lib/types'
import { EDITORIAL_CONTENT_DEFAULTS } from '@/data/editorial-defaults'
import { mergeEditorialContentEntries } from '@/lib/editorial-content-model'

export type EditorialContentKind = 'learn_page' | 'glossary_term' | 'corrections_policy'
export type EditorialContentStatus = 'draft' | 'published' | 'coming_soon'

export interface EditorialAuthorOverride extends Author {
  isActive: boolean
  updatedAt: string | null
}

export interface EditorialContentEntry {
  id: string
  kind: EditorialContentKind
  slug: string
  title: string
  summary: string
  content: string
  status: EditorialContentStatus
  metaTitle?: string
  metaDescription?: string
  relatedTerms: string[]
  sortOrder: number
  updatedAt: string | null
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function toIsoString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' ? value : null
}

export const getEditorialAuthorOverrides = cache(async (): Promise<EditorialAuthorOverride[]> => {
  try {
    const rows = await sql`
      SELECT slug, name, role, bio, avatar, beat, same_as, is_active, updated_at
      FROM public.editorial_authors
      ORDER BY name ASC, slug ASC
    `

    return rows.map((row) => ({
      slug: String(row.slug),
      name: String(row.name),
      role: String(row.role ?? ''),
      bio: String(row.bio ?? ''),
      avatar: typeof row.avatar === 'string' && row.avatar ? row.avatar : undefined,
      beat: toStringArray(row.beat),
      sameAs: toStringArray(row.same_as),
      isActive: row.is_active === true,
      updatedAt: toIsoString(row.updated_at),
    }))
  } catch {
    return []
  }
})

export const getEditorialContentEntries = cache(
  async (kind?: EditorialContentKind): Promise<EditorialContentEntry[]> => {
    try {
      const rows = kind
        ? await sql`
            SELECT id, kind, slug, title, summary, content, status, meta_title,
                   meta_description, related_terms, sort_order, updated_at
            FROM public.editorial_content
            WHERE kind = ${kind}
            ORDER BY sort_order ASC, title ASC, slug ASC
          `
        : await sql`
            SELECT id, kind, slug, title, summary, content, status, meta_title,
                   meta_description, related_terms, sort_order, updated_at
            FROM public.editorial_content
            ORDER BY kind ASC, sort_order ASC, title ASC, slug ASC
          `

      return rows.map((row) => ({
        id: String(row.id),
        kind: row.kind as EditorialContentKind,
        slug: String(row.slug),
        title: String(row.title),
        summary: String(row.summary ?? ''),
        content: sanitizeEditorialHtml(String(row.content ?? '')),
        status: row.status as EditorialContentStatus,
        metaTitle: typeof row.meta_title === 'string' ? row.meta_title : undefined,
        metaDescription:
          typeof row.meta_description === 'string' ? row.meta_description : undefined,
        relatedTerms: toStringArray(row.related_terms),
        sortOrder: Number(row.sort_order ?? 0),
        updatedAt: toIsoString(row.updated_at),
      }))
    } catch {
      return []
    }
  },
)

export const getAdminEditorialContentEntries = cache(
  async (kind?: EditorialContentKind): Promise<EditorialContentEntry[]> => {
    const stored = await getEditorialContentEntries()
    const entries = mergeEditorialContentEntries(EDITORIAL_CONTENT_DEFAULTS, stored, true)
    return kind ? entries.filter((entry) => entry.kind === kind) : entries
  },
)

export const getPublicEditorialContentEntries = cache(
  async (kind?: EditorialContentKind): Promise<EditorialContentEntry[]> => {
    const stored = await getEditorialContentEntries()
    const entries = mergeEditorialContentEntries(EDITORIAL_CONTENT_DEFAULTS, stored, false)
    return entries.filter(
      (entry) => entry.status !== 'draft' && (!kind || entry.kind === kind),
    )
  },
)

export const getPublicEditorialContentEntry = cache(
  async (
    kind: EditorialContentKind,
    slug: string,
  ): Promise<EditorialContentEntry | undefined> => {
    return (await getPublicEditorialContentEntries(kind)).find((entry) => entry.slug === slug)
  },
)

export const getEditorialContentEntry = cache(
  async (
    kind: EditorialContentKind,
    slug: string,
  ): Promise<EditorialContentEntry | undefined> => {
    return (await getEditorialContentEntries(kind)).find((entry) => entry.slug === slug)
  },
)

export function editorialAuthorToAuthor(override: EditorialAuthorOverride): Author {
  return {
    name: override.name,
    slug: override.slug,
    role: override.role,
    bio: override.bio,
    avatar: override.avatar,
    beat: override.beat,
    sameAs: override.sameAs,
  }
}

export function mergeEditorialAuthor(
  author: Author,
  override: EditorialAuthorOverride | undefined,
): Author {
  return override ? editorialAuthorToAuthor(override) : author
}

export function getEditorialAuthorMap(
  overrides: EditorialAuthorOverride[],
): Map<string, EditorialAuthorOverride> {
  return new Map(overrides.map((author) => [author.slug, author]))
}

export function getActiveEditorialAuthorOverrides(
  overrides: EditorialAuthorOverride[],
): EditorialAuthorOverride[] {
  return overrides.filter((author) => author.isActive)
}

export function getEditorialContentMap(
  entries: EditorialContentEntry[],
): Map<string, EditorialContentEntry> {
  return new Map(entries.map((entry) => [entry.slug, entry]))
}

export function getEditorialContentEntryBySlug(
  entries: EditorialContentEntry[],
  slug: string,
): EditorialContentEntry | undefined {
  return getEditorialContentMap(entries).get(slug)
}

export function isEditorialContentPublished(entry: EditorialContentEntry | undefined): boolean {
  return entry?.status === 'published'
}

export function normalizeEditorialContentStatus(
  value: unknown,
): EditorialContentStatus {
  return value === 'published' || value === 'coming_soon' ? value : 'draft'
}

export function isEditorialContentKind(value: unknown): value is EditorialContentKind {
  return value === 'learn_page' || value === 'glossary_term' || value === 'corrections_policy'
}

export function isEditorialContentStatus(value: unknown): value is EditorialContentStatus {
  return value === 'draft' || value === 'published' || value === 'coming_soon'
}

export function editorialContentKindLabel(kind: EditorialContentKind): string {
  switch (kind) {
    case 'learn_page':
      return 'Learn page'
    case 'glossary_term':
      return 'Glossary term'
    case 'corrections_policy':
      return 'Corrections policy'
  }
}

export function editorialContentStatusLabel(status: EditorialContentStatus): string {
  switch (status) {
    case 'published':
      return 'Published'
    case 'coming_soon':
      return 'Coming soon'
    case 'draft':
      return 'Draft'
  }
}

export function getEditorialContentUrl(entry: Pick<EditorialContentEntry, 'kind' | 'slug'>): string {
  if (entry.kind === 'glossary_term') return `/learn/glossary/${entry.slug}`
  if (entry.kind === 'learn_page') {
    if (entry.slug === 'index') return '/learn'
    if (entry.slug === 'glossary') return '/learn/glossary'
    return `/learn/${entry.slug}`
  }
  return '/corrections'
}
