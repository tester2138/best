import 'server-only'

import { authors as staticAuthors, posts as staticPosts } from '@/data/posts'
import { list } from '@vercel/blob'
import { getVerifiedBlobToken } from '@/lib/blob-storage-safety'
import { EDITORIAL_CONTENT_DEFAULTS } from '@/data/editorial-defaults'
import type { Author, Post } from '@/lib/types'
import type { EditorialContentEntry } from '@/lib/editorial-content'
import { mergeEditorialContentEntries } from '@/lib/editorial-content-model'
import { STATIC_CATEGORY_LABELS } from '@/lib/public-categories'
import { sanitizeEditorialHtml } from '@/lib/sanitize'
import { query, queryOne } from '@/lib/portal/db'

export type AdminPostStatus = 'draft' | 'published' | 'scheduled'

export interface AdminNewsPost extends Post {
  status: AdminPostStatus
}

export interface AdminEditorialAuthor extends Author {
  isActive: boolean
  updatedAt: string | null
  isOverridden: boolean
}

export interface AdminCategory {
  id: string | null
  slug: string
  name: string
  description: string
  hasDatabaseRecord: boolean
}

export interface AdminSourceReference {
  key: string
  postSlug: string
  postTitle: string
  label: string
  url: string
  primary: boolean
}

export interface AdminEditorialMedia {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

function toIsoString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' ? value : null
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  return []
}

function parseLinkedSources(value: unknown): Post['linkedSources'] {
  let parsed = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return undefined
    }
  }
  if (!Array.isArray(parsed)) return undefined
  return parsed.filter(
    (item): item is { label: string; url: string } =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof item.label === 'string' &&
      typeof item.url === 'string',
  )
}

function mapPostRow(row: Record<string, unknown>): Post {
  const authorSlug = String(row.author_slug ?? 'editorial')
  const fallbackAuthor = staticAuthors.find((author) => author.slug === authorSlug)
  const author: Author = {
    ...fallbackAuthor,
    name: String(row.author_name ?? fallbackAuthor?.name ?? 'BestForex Editorial'),
    slug: authorSlug,
    avatar: typeof row.author_avatar === 'string' ? row.author_avatar : fallbackAuthor?.avatar,
    bio: typeof row.author_bio === 'string' ? row.author_bio : fallbackAuthor?.bio,
    role: typeof row.author_role === 'string' ? row.author_role : fallbackAuthor?.role,
  }

  return {
    id: String(row.id ?? row.slug),
    slug: String(row.slug),
    title: String(row.title ?? ''),
    excerpt: String(row.excerpt ?? ''),
    content: typeof row.content === 'string' ? row.content : undefined,
    category: String(row.category ?? 'news') as Post['category'],
    editorialType: typeof row.editorial_type === 'string'
      ? row.editorial_type as Post['editorialType']
      : undefined,
    author,
    publishedAt: toIsoString(row.published_at) ?? '',
    updatedAt: toIsoString(row.updated_at) ?? undefined,
    featuredImage: typeof row.featured_image === 'string' ? row.featured_image : undefined,
    imageAltText: typeof row.image_alt_text === 'string' ? row.image_alt_text : undefined,
    isFeatured: row.is_featured === true,
    readingTime: typeof row.reading_time === 'string' ? row.reading_time : undefined,
    wordCount: typeof row.word_count === 'number' ? row.word_count : undefined,
    metaTitle: typeof row.meta_title === 'string' ? row.meta_title : undefined,
    metaDescription: typeof row.meta_description === 'string' ? row.meta_description : undefined,
    sourceName: typeof row.source_name === 'string' ? row.source_name : undefined,
    sourceUrl: typeof row.source_url === 'string' ? row.source_url : undefined,
    tags: toStringArray(row.tags),
    relatedBrokers: toStringArray(row.related_brokers),
    linkedSources: parseLinkedSources(row.linked_sources),
    editorNote: typeof row.editor_note === 'string' ? row.editor_note : undefined,
  }
}

function mergeStoredPost(post: Post, staticPost: Post | undefined): Post {
  if (!staticPost) return post
  return {
    ...staticPost,
    ...post,
    content: post.content ?? staticPost.content,
    sourceName: post.sourceName ?? staticPost.sourceName,
    sourceUrl: post.sourceUrl ?? staticPost.sourceUrl,
    editorNote: post.editorNote ?? staticPost.editorNote,
  }
}

function deriveStatus(status: unknown, publishedAt: string): AdminPostStatus {
  if (status === 'draft') return 'draft'
  if (status === 'scheduled') return 'scheduled'
  const publishedTime = new Date(publishedAt).getTime()
  return Number.isFinite(publishedTime) && publishedTime > Date.now() ? 'scheduled' : 'published'
}

const POST_LIST_COLUMNS = `
  id::text AS id, slug, title, excerpt, category, editorial_type,
  author_name, author_slug, author_avatar, author_bio, author_role,
  featured_image, image_alt_text, is_featured, status, published_at, updated_at,
  reading_time, word_count, meta_title, meta_description, source_name, source_url,
  tags, related_brokers, linked_sources, editor_note
`

export async function getAdminNewsPosts(): Promise<AdminNewsPost[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT ${POST_LIST_COLUMNS} FROM public.posts`,
  )
  const staticBySlug = new Map(staticPosts.map((post) => [post.slug, post]))
  const databaseSlugs = new Set<string>()
  const posts: AdminNewsPost[] = rows.map((row) => {
    const post = mapPostRow(row)
    databaseSlugs.add(post.slug)
    const merged = mergeStoredPost(post, staticBySlug.get(post.slug))
    return { ...merged, status: deriveStatus(row.status, merged.publishedAt) }
  })

  for (const post of staticPosts) {
    if (databaseSlugs.has(post.slug)) continue
    posts.push({
      ...post,
      status: deriveStatus('published', post.publishedAt),
    })
  }

  return posts.sort((a, b) => {
    const dateDifference = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    return (Number.isFinite(dateDifference) ? dateDifference : 0) || a.slug.localeCompare(b.slug)
  })
}

export async function getAdminNewsPost(slug: string): Promise<AdminNewsPost | undefined> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM public.posts WHERE slug = $1 LIMIT 1`,
    [slug],
  )
  const staticPost = staticPosts.find((post) => post.slug === slug)
  if (!row && !staticPost) return undefined
  if (!row && staticPost) {
    return { ...staticPost, status: deriveStatus('published', staticPost.publishedAt) }
  }

  const post = mapPostRow(row!)
  const merged = mergeStoredPost(post, staticPost)
  return { ...merged, status: deriveStatus(row!.status, merged.publishedAt) }
}

export async function getAdminEditorialAuthors(): Promise<AdminEditorialAuthor[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT slug, name, role, bio, avatar, beat, same_as, is_active, updated_at
       FROM public.editorial_authors
      ORDER BY name ASC, slug ASC`,
  )
  const storedBySlug = new Map(rows.map((row) => [String(row.slug), row]))
  const authorsBySlug = new Map<string, AdminEditorialAuthor>()

  for (const author of staticAuthors) {
    const stored = storedBySlug.get(author.slug)
    authorsBySlug.set(author.slug, {
      ...author,
      ...(stored ? {
        name: String(stored.name),
        role: String(stored.role ?? ''),
        bio: String(stored.bio ?? ''),
        avatar: typeof stored.avatar === 'string' ? stored.avatar : undefined,
        beat: toStringArray(stored.beat),
        sameAs: toStringArray(stored.same_as),
        isActive: stored.is_active === true,
        updatedAt: toIsoString(stored.updated_at),
      } : { isActive: true, updatedAt: null }),
      isOverridden: Boolean(stored),
    })
  }

  for (const row of rows) {
    const slug = String(row.slug)
    if (authorsBySlug.has(slug)) continue
    authorsBySlug.set(slug, {
      slug,
      name: String(row.name),
      role: String(row.role ?? ''),
      bio: String(row.bio ?? ''),
      avatar: typeof row.avatar === 'string' ? row.avatar : undefined,
      beat: toStringArray(row.beat),
      sameAs: toStringArray(row.same_as),
      isActive: row.is_active === true,
      updatedAt: toIsoString(row.updated_at),
      isOverridden: true,
    })
  }

  return [...authorsBySlug.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug),
  )
}

export async function getAdminEditorialAuthor(slug: string): Promise<AdminEditorialAuthor | undefined> {
  return (await getAdminEditorialAuthors()).find((author) => author.slug === slug)
}

export async function getAdminEditorialContentEntries(
  kind?: EditorialContentEntry['kind'],
): Promise<EditorialContentEntry[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id::text AS id, kind, slug, title, summary, content, status,
            meta_title, meta_description, related_terms, sort_order, updated_at
       FROM public.editorial_content
      ORDER BY kind ASC, sort_order ASC, title ASC, slug ASC`,
  )
  const stored: EditorialContentEntry[] = rows.map((row) => ({
    id: String(row.id),
    kind: row.kind as EditorialContentEntry['kind'],
    slug: String(row.slug),
    title: String(row.title),
    summary: String(row.summary ?? ''),
    content: sanitizeEditorialHtml(String(row.content ?? '')),
    status: row.status as EditorialContentEntry['status'],
    metaTitle: typeof row.meta_title === 'string' ? row.meta_title : undefined,
    metaDescription: typeof row.meta_description === 'string' ? row.meta_description : undefined,
    relatedTerms: toStringArray(row.related_terms),
    sortOrder: Number(row.sort_order ?? 0),
    updatedAt: toIsoString(row.updated_at),
  }))
  const entries = mergeEditorialContentEntries(EDITORIAL_CONTENT_DEFAULTS, stored, true)
  return kind ? entries.filter((entry) => entry.kind === kind) : entries
}

export async function getAdminEditorialContentEntry(
  kind: EditorialContentEntry['kind'],
  slug: string,
): Promise<EditorialContentEntry | undefined> {
  return (await getAdminEditorialContentEntries(kind)).find((entry) => entry.slug === slug)
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id::text AS id, slug, name, description
       FROM public.categories
      ORDER BY name ASC, slug ASC`,
  )
  const categories = new Map<string, AdminCategory>(
    Object.entries(STATIC_CATEGORY_LABELS).map(([slug, name]) => [slug, {
      id: null,
      slug,
      name,
      description: '',
      hasDatabaseRecord: false,
    }]),
  )

  for (const row of rows) {
    const slug = String(row.slug)
    categories.set(slug, {
      id: String(row.id),
      slug,
      name: String(row.name),
      description: String(row.description ?? ''),
      hasDatabaseRecord: true,
    })
  }

  return [...categories.values()].sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug))
}

export async function getAdminCategory(slug: string): Promise<AdminCategory | undefined> {
  return (await getAdminCategories()).find((category) => category.slug === slug)
}

export async function getAdminEditorialMedia(): Promise<AdminEditorialMedia[]> {
  const result = await list({ limit: 1_000, token: getVerifiedBlobToken() })
  return result.blobs
    .filter((blob) => /\.(?:png|jpe?g|webp|gif|avif)$/i.test(blob.pathname))
    .map((blob) => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt.toISOString(),
    }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt) || a.pathname.localeCompare(b.pathname))
}

export async function getAdminSourceReferences(): Promise<AdminSourceReference[]> {
  const posts = await getAdminNewsPosts()
  const references: AdminSourceReference[] = []
  const seen = new Set<string>()

  for (const post of posts) {
    if (post.sourceUrl) {
      const key = `${post.slug}:${post.sourceUrl}`
      seen.add(key)
      references.push({
        key,
        postSlug: post.slug,
        postTitle: post.title,
        label: post.sourceName || 'Primary source',
        url: post.sourceUrl,
        primary: true,
      })
    }
    for (const [index, source] of (post.linkedSources ?? []).entries()) {
      const key = `${post.slug}:${source.url}`
      if (seen.has(key)) continue
      seen.add(key)
      references.push({
        key: `${key}:${index}`,
        postSlug: post.slug,
        postTitle: post.title,
        label: source.label,
        url: source.url,
        primary: false,
      })
    }
  }

  return references.sort(
    (a, b) => a.postTitle.localeCompare(b.postTitle) || a.label.localeCompare(b.label),
  )
}

export function getAdminSourceDisplayUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function getStaticPostSlug(slug: string): boolean {
  return staticPosts.some((post) => post.slug === slug)
}

export function getStaticAuthorSlug(slug: string): boolean {
  return staticAuthors.some((author) => author.slug === slug)
}

export function getStaticEditorialAuthor(slug: string): Author | undefined {
  return staticAuthors.find((author) => author.slug === slug)
}

export function getStaticPost(slug: string): Post | undefined {
  return staticPosts.find((post) => post.slug === slug)
}

export function getStaticCategory(slug: string): string | undefined {
  return STATIC_CATEGORY_LABELS[slug]
}

export function hasDefaultEditorialContent(kind: EditorialContentEntry['kind'], slug: string): boolean {
  return EDITORIAL_CONTENT_DEFAULTS.some((entry) => entry.kind === kind && entry.slug === slug)
}

export function getDefaultEditorialContent(
  kind: EditorialContentEntry['kind'],
  slug: string,
): EditorialContentEntry | undefined {
  return EDITORIAL_CONTENT_DEFAULTS.find((entry) => entry.kind === kind && entry.slug === slug)
}

export function serializeEditorialSourceLinks(sources: Post['linkedSources']): string {
  return (sources ?? []).map((source) => `${source.label} | ${source.url}`).join('\n')
}

export function serializeStringList(items: string[] | undefined): string {
  return (items ?? []).join('\n')
}

export function toLocalDateTimeInput(value: string | undefined): string {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}

export function getAdminPostStatusLabel(status: AdminPostStatus): string {
  if (status === 'scheduled') return 'Scheduled'
  return status === 'draft' ? 'Draft' : 'Published'
}

export function getAdminPostListHref(slug: string): string {
  return `/admin/news/${encodeURIComponent(slug)}`
}

export function getAdminAuthorListHref(slug: string): string {
  return `/admin/authors/${encodeURIComponent(slug)}`
}

export function getAdminContentListHref(kind: EditorialContentEntry['kind'], slug: string): string {
  return `/admin/learning/${kind}/${encodeURIComponent(slug)}`
}

export function getAdminCategoryListHref(slug: string): string {
  return `/admin/categories/${encodeURIComponent(slug)}`
}

export function getEditorialContentForAdminKind(kind: string): EditorialContentEntry['kind'] | null {
  return kind === 'learn_page' || kind === 'glossary_term' || kind === 'corrections_policy'
    ? kind
    : null
}

export function safeAdminPageNumber(value: string | undefined): number {
  const page = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(page) ? Math.max(1, page) : 1
}

export function hasCategorySlug(slug: string): boolean {
  return Object.hasOwn(STATIC_CATEGORY_LABELS, slug)
}

export function getEditorialUrlForPost(post: Pick<Post, 'slug'>): string {
  return `/news/${post.slug}`
}

export function getEditorialUrlForAuthor(slug: string): string {
  return `/news/author/${slug}`
}

export function getEditorialCategoryUrl(slug: string): string {
  return `/news/category/${slug}`
}

export function statusFromStoredRow(status: unknown, publishedAt: string): AdminPostStatus {
  return deriveStatus(status, publishedAt)
}

export function getAdminPostFromStatic(slug: string): AdminNewsPost | undefined {
  const post = staticPosts.find((entry) => entry.slug === slug)
  return post ? { ...post, status: deriveStatus('published', post.publishedAt) } : undefined
}

export function getAdminPublishedAuthorSlugs(posts: AdminNewsPost[]): Set<string> {
  return new Set(posts.filter((post) => post.status === 'published').map((post) => post.author.slug))
}

export function getAdminEditorialAuthorSlug(author: AdminEditorialAuthor): string {
  return author.slug
}

export function getAdminCategoryName(category: AdminCategory): string {
  return category.name
}

export function getAdminCategoryDescription(category: AdminCategory): string {
  return category.description
}

export function getAdminPostCategory(post: AdminNewsPost): string {
  return String(post.category)
}

export function getAdminPostPublishedAt(post: AdminNewsPost): string {
  return post.publishedAt
}

export function getAdminPostAuthor(post: AdminNewsPost): AdminEditorialAuthor | undefined {
  return undefined
}

export function getAdminPostImage(post: AdminNewsPost): { url: string; alt: string } | null {
  if (!post.featuredImage) return null
  return { url: post.featuredImage, alt: post.imageAltText || post.title }
}

export function getAdminSourceCount(post: AdminNewsPost): number {
  return (post.sourceUrl ? 1 : 0) + (post.linkedSources?.length ?? 0)
}

export function getAdminEditorialAuthorCount(authors: AdminEditorialAuthor[]): number {
  return authors.filter((author) => author.isActive).length
}

export function isValidEditorialSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export function isValidEditorialDateTime(value: string): boolean {
  return value.length > 0 && Number.isFinite(new Date(value).getTime())
}

export function getStaticEditorialEntries(): EditorialContentEntry[] {
  return [...EDITORIAL_CONTENT_DEFAULTS]
}

export function getStaticAuthorEntries(): AdminEditorialAuthor[] {
  return staticAuthors.map((author) => ({ ...author, isActive: true, updatedAt: null, isOverridden: false }))
}

export function getStaticCategoryEntries(): AdminCategory[] {
  return Object.entries(STATIC_CATEGORY_LABELS).map(([slug, name]) => ({
    id: null,
    slug,
    name,
    description: '',
    hasDatabaseRecord: false,
  }))
}

export function getStaticSourceReferences(): AdminSourceReference[] {
  const references: AdminSourceReference[] = []
  for (const post of staticPosts) {
    if (post.sourceUrl) {
      references.push({
        key: `${post.slug}:primary:${post.sourceUrl}`,
        postSlug: post.slug,
        postTitle: post.title,
        label: post.sourceName || 'Primary source',
        url: post.sourceUrl,
        primary: true,
      })
    }
    for (const [index, source] of (post.linkedSources ?? []).entries()) {
      references.push({
        key: `${post.slug}:${index}:${source.url}`,
        postSlug: post.slug,
        postTitle: post.title,
        label: source.label,
        url: source.url,
        primary: false,
      })
    }
  }
  return references
}
