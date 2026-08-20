/**
 * lib/news-queries.ts — Server-only Neon query helpers for news posts.
 *
 * All async post helpers live here (not in data/posts.ts) so that the `sql`
 * import from lib/db.ts appears at the top of a proper server module instead
 * of being buried inside the large static data file. This prevents Turbopack
 * from incorrectly bundling the Neon client into non-server contexts.
 *
 * Consumers import from @/data/posts as usual — posts.ts re-exports everything
 * from here, so no import paths need to change.
 *
 * Visibility rule: WHERE status = 'published' AND published_at <= NOW()
 * This means a post staged with a future date becomes live automatically when
 * the ISR revalidation fires (revalidate = 3600) after that date — no deploy.
 */

import { sql } from '@/lib/db'
import type { Post, Author } from '@/lib/types'
import { authors, posts as staticPosts } from '@/data/posts'

// ─── Resilience layer ────────────────────────────────────────────────────────
// The DB is the source of truth for scheduling, but it can be unavailable
// (Neon compute-quota 402, cold-start timeout, network blip). Previously any
// such failure bubbled up through the page's RSC and tripped app/error.tsx,
// taking down `/` and `/news` entirely. The in-repo `posts` array in
// data/posts.ts is the canonical seed source and mirrors the DB contents, so
// it is a faithful read-only fallback: readers still get the full archive with
// the same visibility rule applied in JS instead of SQL.

/** True once a post's scheduled publish time has arrived. */
function isLive(post: Post, now: number): boolean {
  const t = new Date(post.publishedAt).getTime()
  return Number.isNaN(t) ? true : t <= now
}

/**
 * JS mirror of the Postgres tag-slug expression below (and of tagToSlug in
 * data/posts.ts). Kept local so the fallback path has no circular dependency
 * on the function-level exports of data/posts.ts.
 */
function slugifyTagJs(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Static mirror of `WHERE published_at <= NOW() ORDER BY published_at DESC`. */
function staticVisiblePosts(): Post[] {
  const now = Date.now()
  return staticPosts
    .filter((p) => isLive(p, now))
    .sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
}

/**
 * Run a DB query, falling back to the static archive if the database errors.
 * Never throws — callers are React Server Components that must still render.
 */
async function withFallback<T>(
  label: string,
  run: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    return await run()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[news-queries] ${label}: database unavailable, serving static archive — ${message}`,
    )
    return fallback()
  }
}

// ─── DB row → Post mapper ────────────────────────────────────────────────────

export function mapRow(row: Record<string, unknown>): Post {
  const authorBase: Author = {
    name: (row.author_name as string) ?? 'BestForex Editorial',
    slug: (row.author_slug as string) ?? 'editorial',
    avatar: (row.author_avatar as string | undefined) ?? undefined,
    bio: (row.author_bio as string | undefined) ?? undefined,
    role: (row.author_role as string | undefined) ?? undefined,
  }
  // Merge with the full static author record so fields like `beat` and `sameAs`
  // are always present without duplicating them in the DB.
  const richAuthor = authors.find((a) => a.slug === authorBase.slug)
  const author = richAuthor ? { ...richAuthor, ...authorBase } : authorBase

  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    content: (row.content as string | null) ?? undefined,
    category: row.category as Post['category'],
    editorialType: (row.editorial_type as Post['editorialType']) ?? undefined,
    author,
    publishedAt:
      row.published_at instanceof Date
        ? row.published_at.toISOString()
        : (row.published_at as string),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : (row.updated_at as string | undefined) ?? undefined,
    featuredImage: (row.featured_image as string | null) ?? undefined,
    imageAltText: (row.image_alt_text as string | null) ?? undefined,
    isFeatured: (row.is_featured as boolean) ?? false,
    readingTime: (row.reading_time as string | null) ?? undefined,
    wordCount: (row.word_count as number | null) ?? undefined,
    metaTitle: (row.meta_title as string | null) ?? undefined,
    metaDescription: (row.meta_description as string | null) ?? undefined,
    tags: (row.tags as string[] | null) ?? undefined,
    relatedBrokers: (row.related_brokers as string[] | null) ?? undefined,
    linkedSources:
      (row.linked_sources as { label: string; url: string }[] | null) ?? undefined,
  }
}

// ─── Query helpers ───────────────────────────────────────────────────────────
// All queries use the same visibility rule: status = 'published' AND
// published_at <= NOW(). The database evaluates NOW() at query time — not at
// build/bundle time — so ISR reruns pick up newly scheduled posts automatically.

/** Every post that is published and whose scheduled date has arrived. */
export async function getVisiblePosts(): Promise<Post[]> {
  return withFallback(
    'getVisiblePosts',
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
        ORDER BY published_at DESC
      `
      return rows.map(mapRow)
    },
    staticVisiblePosts,
  )
}

/** Single post by slug — returns undefined (404) if not yet live. */
export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  return withFallback(
    `getPostBySlug(${slug})`,
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, content, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
          AND slug = ${slug}
        LIMIT 1
      `
      return rows.length ? mapRow(rows[0]) : undefined
    },
    () => staticVisiblePosts().find((p) => p.slug === slug),
  )
}

export async function getFeaturedPosts(): Promise<Post[]> {
  return withFallback(
    'getFeaturedPosts',
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
          AND is_featured = true
        ORDER BY published_at DESC
      `
      return rows.map(mapRow)
    },
    () => staticVisiblePosts().filter((p) => p.isFeatured),
  )
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  return withFallback(
    `getPostsByCategory(${category})`,
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
          AND category = ${category}
        ORDER BY published_at DESC
      `
      return rows.map(mapRow)
    },
    () => staticVisiblePosts().filter((p) => p.category === category),
  )
}

export async function getLatestPosts(count = 5): Promise<Post[]> {
  return withFallback(
    'getLatestPosts',
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
        ORDER BY published_at DESC
        LIMIT ${count}
      `
      return rows.map(mapRow)
    },
    () => staticVisiblePosts().slice(0, count),
  )
}

/** Google News discovery: visible stories published within the last 48 hours. */
export async function getNewsSitemapPosts(): Promise<Post[]> {
  return withFallback(
    'getNewsSitemapPosts',
    async () => {
      const rows = await sql`
        SELECT id, slug, title, published_at
        FROM public.posts
        WHERE status = 'published'
          AND published_at <= NOW()
          AND published_at >= NOW() - INTERVAL '48 hours'
        ORDER BY published_at DESC
        LIMIT 1000
      `
      return rows.map(mapRow)
    },
    () => {
      const cutoff = Date.now() - 48 * 60 * 60 * 1000
      return staticVisiblePosts()
        .filter((p) => new Date(p.publishedAt).getTime() >= cutoff)
        .slice(0, 1000)
    },
  )
}

/** Canonical RSS feed: newest visible stories with complete article HTML. */
export async function getRssFeedPosts(): Promise<Post[]> {
  return withFallback(
    'getRssFeedPosts',
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, content, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
        ORDER BY published_at DESC
        LIMIT 50
      `
      return rows.map(mapRow)
    },
    () => staticVisiblePosts().slice(0, 50),
  )
}

export async function getNewsPosts(): Promise<Post[]> {
  return withFallback(
    'getNewsPosts',
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
          AND category IN ('news', 'analysis')
        ORDER BY published_at DESC
      `
      return rows.map(mapRow)
    },
    () =>
      staticVisiblePosts().filter(
        (p) => p.category === 'news' || p.category === 'analysis',
      ),
  )
}

export async function getBlogPosts(): Promise<Post[]> {
  return withFallback(
    'getBlogPosts',
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
          AND category IN ('education', 'guide', 'review')
        ORDER BY published_at DESC
      `
      return rows.map(mapRow)
    },
    () =>
      staticVisiblePosts().filter(
        (p) =>
          p.category === 'education' ||
          p.category === 'guide' ||
          p.category === 'review',
      ),
  )
}

export async function getPostsByAuthor(slug: string): Promise<Post[]> {
  return withFallback(
    `getPostsByAuthor(${slug})`,
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
          AND author_slug = ${slug}
        ORDER BY published_at DESC
      `
      return rows.map(mapRow)
    },
    () => staticVisiblePosts().filter((p) => p.author.slug === slug),
  )
}

/** Posts related to a broker by slug, title match, or tag match. */
export async function getPostsByBrokerSlug(brokerSlug: string): Promise<Post[]> {
  const nameFromSlug = brokerSlug.replace(/-/g, ' ')
  return withFallback(
    `getPostsByBrokerSlug(${brokerSlug})`,
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
          AND (
            related_brokers @> ARRAY[${brokerSlug}]::text[]
            OR LOWER(title) LIKE ${'%' + nameFromSlug + '%'}
            OR EXISTS (
              SELECT 1 FROM unnest(tags) t
              WHERE LOWER(t) LIKE ${'%' + nameFromSlug + '%'}
            )
          )
        ORDER BY published_at DESC
      `
      return rows.map(mapRow)
    },
    () =>
      staticVisiblePosts().filter(
        (p) =>
          p.relatedBrokers?.includes(brokerSlug) ||
          p.title.toLowerCase().includes(nameFromSlug) ||
          p.tags?.some((t) => t.toLowerCase().includes(nameFromSlug)),
      ),
  )
}

/** Authors who have at least one live published post. */
export async function getPublishedAuthors(): Promise<Author[]> {
  return withFallback(
    'getPublishedAuthors',
    async () => {
      const rows = await sql`
        SELECT DISTINCT author_slug
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
          AND author_slug IS NOT NULL
      `
      const activeSlugs = new Set(
        rows.map((r: Record<string, unknown>) => r.author_slug as string),
      )
      return authors.filter((a) => activeSlugs.has(a.slug))
    },
    () => {
      const activeSlugs = new Set(staticVisiblePosts().map((p) => p.author.slug))
      return authors.filter((a) => activeSlugs.has(a.slug))
    },
  )
}

/**
 * Slugify a raw tag string inside Postgres, matching the JS tagToSlug() logic.
 *
 * Approach (P1-263 null-byte fix):
 *   \x00-\x7F in a JS template literal → the JS engine evaluates \x00 as the
 *   actual null byte U+0000, which Neon rejects with "string contains embedded
 *   null". We therefore use Postgres POSIX character classes instead:
 *     [^[:ascii:]]  – strips every non-ASCII character (€, £, ¥, accented, …)
 *     [[:space:]_]  – matches whitespace and underscore for hyphen-collapse
 *   These patterns are pure ASCII text with no escape sequences, so they are
 *   safe to embed directly in a tagged-template SQL literal.
 */

/** Inline SQL expression for tag → URL slug, referencing a column alias `t`. */
const slugifyTag = (col: string) =>
  `TRIM(BOTH '-' FROM REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(${col}), '[^[:ascii:]]', '', 'g'), '[[:space:]_]+', '-', 'g'), '[^a-z0-9-]', '', 'g'))`

/** Posts carrying the given tag slug (lowercased + ASCII-only hyphenated). */
export async function getPostsByTag(tagSlug: string): Promise<Post[]> {
  return withFallback(
    `getPostsByTag(${tagSlug})`,
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, tags, related_brokers, linked_sources
        FROM public.posts
        WHERE status = 'published' AND published_at <= NOW()
          AND EXISTS (
            SELECT 1 FROM unnest(tags) AS t
            WHERE TRIM(BOTH '-' FROM REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(t), '[^[:ascii:]]', '', 'g'), '[[:space:]_]+', '-', 'g'), '[^a-z0-9-]', '', 'g')) = ${tagSlug}
          )
        ORDER BY published_at DESC
      `
      return rows.map(mapRow)
    },
    () =>
      staticVisiblePosts().filter((p) =>
        p.tags?.some((t) => slugifyTagJs(t) === tagSlug),
      ),
  )
}

/** All unique tag slugs with their label and published article count. */
export async function getAllTags(): Promise<{ slug: string; label: string; count: number }[]> {
  return withFallback(
    'getAllTags',
    async () => {
      const rows = await sql`
        SELECT
          TRIM(BOTH '-' FROM REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(t), '[^[:ascii:]]', '', 'g'), '[[:space:]_]+', '-', 'g'), '[^a-z0-9-]', '', 'g')) AS slug,
          t                           AS label,
          COUNT(*)::int               AS count
        FROM public.posts, unnest(tags) AS t
        WHERE status = 'published' AND published_at <= NOW()
        GROUP BY t
        ORDER BY count DESC, t ASC
      `
      return rows.map((r: Record<string, unknown>) => ({
        slug: r.slug as string,
        label: r.label as string,
        count: r.count as number,
      }))
    },
    () => {
      const counts = new Map<string, { slug: string; label: string; count: number }>()
      for (const post of staticVisiblePosts()) {
        for (const tag of post.tags ?? []) {
          const existing = counts.get(tag)
          if (existing) existing.count += 1
          else counts.set(tag, { slug: slugifyTagJs(tag), label: tag, count: 1 })
        }
      }
      return [...counts.values()]
        .filter((t) => t.slug.length > 0)
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    },
  )
}
