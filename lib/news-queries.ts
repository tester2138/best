import { cache } from 'react'
import { authors, posts as staticPosts } from '@/data/posts'
import { sql } from '@/lib/db'
import {
  isPostLive,
  mergeVisiblePosts,
  resolveVisiblePost,
  type StoredPostRecord,
} from '@/lib/news-archive'
import type { Author, Post } from '@/lib/types'
import {
  getEditorialAuthorOverrides,
  getEditorialAuthorMap,
  editorialAuthorToAuthor,
  mergeEditorialAuthor,
} from '@/lib/editorial-content'
import { sanitizeEditorialHtml } from '@/lib/sanitize'

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' ? value : ''
}

function parseLinkedSources(value: unknown): Post['linkedSources'] {
  if (Array.isArray(value)) return value as Post['linkedSources']
  if (typeof value !== 'string') return undefined

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function mapRow(row: Record<string, unknown>): Post {
  const authorBase: Author = {
    name: (row.author_name as string) ?? 'BestForex Editorial',
    slug: (row.author_slug as string) ?? 'editorial',
    avatar: (row.author_avatar as string | undefined) ?? undefined,
    bio: (row.author_bio as string | undefined) ?? undefined,
    role: (row.author_role as string | undefined) ?? undefined,
  }
  const richAuthor = authors.find((author) => author.slug === authorBase.slug)

  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    content: typeof row.content === 'string' ? sanitizeEditorialHtml(row.content) : undefined,
    category: row.category as Post['category'],
    editorialType: (row.editorial_type as Post['editorialType']) ?? undefined,
    author: richAuthor ? { ...richAuthor, ...authorBase } : authorBase,
    publishedAt: toIsoString(row.published_at),
    updatedAt: toIsoString(row.updated_at) || undefined,
    featuredImage: (row.featured_image as string | null) ?? undefined,
    imageAltText: (row.image_alt_text as string | null) ?? undefined,
    isFeatured: (row.is_featured as boolean) ?? false,
    readingTime: (row.reading_time as string | null) ?? undefined,
    wordCount: (row.word_count as number | null) ?? undefined,
    metaTitle: (row.meta_title as string | null) ?? undefined,
    metaDescription: (row.meta_description as string | null) ?? undefined,
    sourceName: (row.source_name as string | null) ?? undefined,
    sourceUrl: (row.source_url as string | null) ?? undefined,
    tags: (row.tags as string[] | null) ?? undefined,
    relatedBrokers: (row.related_brokers as string[] | null) ?? undefined,
    linkedSources: parseLinkedSources(row.linked_sources),
    editorNote: typeof row.editor_note === 'string' ? row.editor_note : undefined,
  }
}

function mapRecord(row: Record<string, unknown>): StoredPostRecord {
  return {
    post: mapRow(row),
    status: (row.status as string | null) ?? null,
  }
}

function staticVisiblePosts(): Post[] {
  const now = Date.now()
  return staticPosts
    .filter((post) => isPostLive(post, now))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() ||
        a.slug.localeCompare(b.slug),
    )
}

// Circuit breaker: when Neon rejects requests (e.g. HTTP 402 data-transfer
// quota), every retry burns quota/latency and spams the console. After a
// quota-style failure we skip DB calls entirely for COOLDOWN_MS and serve the
// canonical static archive, logging once instead of per-request.
const COOLDOWN_MS = 5 * 60 * 1000
let dbCooldownUntil = 0

function isQuotaError(message: string): boolean {
  return message.includes('402') || message.toLowerCase().includes('quota')
}

async function withFallback<T>(
  label: string,
  run: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  if (Date.now() < dbCooldownUntil) {
    return fallback()
  }
  try {
    return await run()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (isQuotaError(message)) {
      dbCooldownUntil = Date.now() + COOLDOWN_MS
      console.warn(
        `[news-queries] ${label}: database quota exceeded, serving canonical archive from static data for ${COOLDOWN_MS / 1000}s — ${message}`,
      )
    } else {
      console.error(
        `[news-queries] ${label}: database unavailable, serving canonical archive — ${message}`,
      )
    }
    return fallback()
  }
}

async function applyEditorialAuthorOverrides(posts: Post[]): Promise<Post[]> {
  const overrides = getEditorialAuthorMap(await getEditorialAuthorOverrides())
  return posts.map((post) => ({
    ...post,
    author: mergeEditorialAuthor(post.author, overrides.get(post.author.slug)),
  }))
}

const getMergedVisiblePosts = cache(async (): Promise<Post[]> => {
  const posts = await withFallback(
    'getVisiblePosts',
    async () => {
      // Deliberately include every status. A draft or future DB row must block
      // the static version of the same slug from becoming visible early.
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured, status,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, source_name, source_url, editor_note, tags,
          related_brokers, linked_sources
        FROM public.posts
      `
      return mergeVisiblePosts(rows.map(mapRecord), staticPosts)
    },
    staticVisiblePosts,
  )
  return applyEditorialAuthorOverrides(posts)
})

export async function getVisiblePosts(): Promise<Post[]> {
  return getMergedVisiblePosts()
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const post = await withFallback(
    `getPostBySlug(${slug})`,
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, content, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured, status,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, source_name, source_url, editor_note, tags,
          related_brokers, linked_sources
        FROM public.posts
        WHERE slug = ${slug}
        LIMIT 1
      `
      const record = rows.length ? mapRecord(rows[0]) : undefined
      return resolveVisiblePost(slug, record, staticPosts)
    },
    () => staticVisiblePosts().find((post) => post.slug === slug),
  )
  return post ? (await applyEditorialAuthorOverrides([post]))[0] : undefined
}

export async function getFeaturedPosts(): Promise<Post[]> {
  return (await getVisiblePosts()).filter((post) => post.isFeatured)
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  return (await getVisiblePosts()).filter((post) => post.category === category)
}

export async function getLatestPosts(count = 5): Promise<Post[]> {
  return (await getVisiblePosts()).slice(0, Math.max(0, count))
}

export async function getNewsSitemapPosts(): Promise<Post[]> {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000
  return (await getVisiblePosts())
    .filter((post) => new Date(post.publishedAt).getTime() >= cutoff)
    .slice(0, 1000)
}

export async function getRssFeedPosts(): Promise<Post[]> {
  const posts = await withFallback(
    'getRssFeedPosts',
    async () => {
      // Keep every status row for visibility gates, but fetch full HTML only for
      // the latest live feed candidates to avoid transferring the whole archive.
      const rows = await sql`
        WITH rss_body_posts AS (
          SELECT id
          FROM public.posts
          WHERE status = 'published'
            AND published_at <= NOW()
          ORDER BY published_at DESC, slug ASC
          LIMIT 50
        )
        SELECT
          post.id, post.slug, post.title, post.excerpt,
          CASE WHEN rss_body_posts.id IS NOT NULL THEN post.content END AS content,
          post.category, post.editorial_type,
          post.author_name, post.author_slug, post.author_avatar,
          post.author_bio, post.author_role,
          post.featured_image, post.image_alt_text, post.is_featured, post.status,
          post.published_at, post.updated_at, post.reading_time, post.word_count,
          post.meta_title, post.meta_description, post.source_name, post.source_url, post.editor_note, post.tags,
          post.related_brokers, post.linked_sources
        FROM public.posts AS post
        LEFT JOIN rss_body_posts ON rss_body_posts.id = post.id
      `
      return mergeVisiblePosts(rows.map(mapRecord), staticPosts).slice(0, 50)
    },
    () => staticVisiblePosts().slice(0, 50),
  )
  return applyEditorialAuthorOverrides(posts)
}

export async function getNewsPosts(): Promise<Post[]> {
  return (await getVisiblePosts()).filter(
    (post) => post.category === 'news' || post.category === 'analysis',
  )
}

export async function getBlogPosts(): Promise<Post[]> {
  return (await getVisiblePosts()).filter(
    (post) =>
      post.category === 'education' ||
      post.category === 'guide' ||
      post.category === 'review',
  )
}

export async function getPostsByAuthor(slug: string): Promise<Post[]> {
  return (await getVisiblePosts()).filter((post) => post.author.slug === slug)
}

export async function getPostsByBrokerSlug(brokerSlug: string): Promise<Post[]> {
  const nameFromSlug = brokerSlug.replace(/-/g, ' ')
  return (await getVisiblePosts()).filter(
    (post) =>
      post.relatedBrokers?.includes(brokerSlug) ||
      post.title.toLowerCase().includes(nameFromSlug) ||
      post.tags?.some((tag) => tag.toLowerCase().includes(nameFromSlug)),
  )
}

export async function getPublishedAuthors(): Promise<Author[]> {
  const [posts, overrides] = await Promise.all([
    getVisiblePosts(),
    getEditorialAuthorOverrides(),
  ])
  const activeSlugs = new Set(posts.map((post) => post.author.slug))
  const authorsBySlug = new Map(authors.map((author) => [author.slug, author]))

  for (const override of overrides) {
    const existing = authorsBySlug.get(override.slug)
    authorsBySlug.set(
      override.slug,
      existing ? mergeEditorialAuthor(existing, override) : editorialAuthorToAuthor(override),
    )
  }

  return [...activeSlugs]
    .map((slug) => authorsBySlug.get(slug))
    .filter((author): author is Author => Boolean(author))
    .sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug))
}

export async function getAuthorBySlug(slug: string): Promise<Author | undefined> {
  const [override, staticAuthor] = await Promise.all([
    getEditorialAuthorOverrides().then((items) => items.find((author) => author.slug === slug)),
    Promise.resolve(authors.find((author) => author.slug === slug)),
  ])
  if (staticAuthor) return mergeEditorialAuthor(staticAuthor, override)
  return override ? editorialAuthorToAuthor(override) : undefined
}
