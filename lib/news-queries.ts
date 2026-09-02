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
    content: (row.content as string | null) ?? undefined,
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
    tags: (row.tags as string[] | null) ?? undefined,
    relatedBrokers: (row.related_brokers as string[] | null) ?? undefined,
    linkedSources: parseLinkedSources(row.linked_sources),
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

async function withFallback<T>(
  label: string,
  run: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    return await run()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[news-queries] ${label}: database unavailable, serving canonical archive — ${message}`,
    )
    return fallback()
  }
}

const getMergedVisiblePosts = cache(async (): Promise<Post[]> =>
  withFallback(
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
          meta_title, meta_description, source_name, tags,
          related_brokers, linked_sources
        FROM public.posts
      `
      return mergeVisiblePosts(rows.map(mapRecord), staticPosts)
    },
    staticVisiblePosts,
  ),
)

export async function getVisiblePosts(): Promise<Post[]> {
  return getMergedVisiblePosts()
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  return withFallback(
    `getPostBySlug(${slug})`,
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, content, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured, status,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, source_name, tags,
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
  return withFallback(
    'getRssFeedPosts',
    async () => {
      const rows = await sql`
        SELECT
          id, slug, title, excerpt, content, category, editorial_type,
          author_name, author_slug, author_avatar, author_bio, author_role,
          featured_image, image_alt_text, is_featured, status,
          published_at, updated_at, reading_time, word_count,
          meta_title, meta_description, source_name, tags,
          related_brokers, linked_sources
        FROM public.posts
      `
      return mergeVisiblePosts(rows.map(mapRecord), staticPosts).slice(0, 50)
    },
    () => staticVisiblePosts().slice(0, 50),
  )
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
  const activeSlugs = new Set(
    (await getVisiblePosts()).map((post) => post.author.slug),
  )
  return authors.filter((author) => activeSlugs.has(author.slug))
}
