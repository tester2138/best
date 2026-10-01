'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import { z } from 'zod'
import { audit } from '@/lib/audit'
import { getVerifiedBlobToken } from '@/lib/blob-storage-safety'
import { requireStaff } from '@/lib/guards'
import {
  getAdminCategories,
  getAdminEditorialAuthor,
  getAdminEditorialContentEntries,
  getAdminNewsPost,
  getStaticAuthorSlug,
  getStaticPost,
  hasDefaultEditorialContent,
} from '@/lib/admin-editorial'
import { EditorialContentKind } from '@/lib/editorial-content'
import { sanitizeEditorialHtml, stripToPlain } from '@/lib/sanitize'
import { Err, run } from '@/lib/portal/result'
import { query, queryOne } from '@/lib/portal/db'

const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens for the slug.')

function parseInput<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new Err(parsed.error.issues[0]?.message ?? 'Check the submitted fields.', 'validation')
  }
  return parsed.data
}

function safeImageUrl(value: string): string | null {
  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.startsWith('/') && !normalized.startsWith('//')) return normalized

  try {
    const url = new URL(normalized)
    if (url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com')) {
      return url.toString()
    }
  } catch {
    // Rejected below without exposing URL parsing details.
  }

  throw new Err('Images must use a site path or an HTTPS Vercel Blob URL.', 'validation')
}

function safeSourceUrl(value: string): string | null {
  const normalized = value.trim()
  if (!normalized) return null
  try {
    const url = new URL(normalized)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString()
  } catch {
    // Rejected below without exposing URL parsing details.
  }
  throw new Err('Source links must use HTTP or HTTPS.', 'validation')
}

function plainTextLength(html: string): number {
  return stripToPlain(html).replace(/&nbsp;/gi, ' ').trim().length
}

function wordCountFor(html: string): number {
  const text = stripToPlain(html).replace(/&nbsp;/gi, ' ').trim()
  return text ? text.split(/\s+/).length : 0
}

function revalidateEditorialRoutes(slug?: string): void {
  revalidatePath('/news')
  revalidatePath('/news/category/[category]', 'page')
  revalidatePath('/news/author/[slug]', 'page')
  revalidatePath('/news/author', 'page')
  revalidatePath('/sitemap.xml')
  revalidatePath('/news/feed.xml')
  if (slug) revalidatePath(`/news/${slug}`)
}

function revalidateLearningRoutes(): void {
  revalidatePath('/learn')
  revalidatePath('/learn/glossary')
  revalidatePath('/learn/glossary/[term]', 'page')
  revalidatePath('/learn/[slug]', 'page')
  revalidatePath('/corrections')
}

const ArticleInput = z.object({
  originalSlug: slugSchema.nullable().optional(),
  slug: slugSchema,
  title: z.string().trim().min(4).max(180),
  excerpt: z.string().trim().min(10).max(500),
  content: z.string().max(1_000_000),
  category: slugSchema,
  editorialType: z.enum(['News', 'Analysis', 'Opinion']).nullable(),
  authorSlug: slugSchema,
  publishedAt: z.string().datetime(),
  status: z.enum(['draft', 'published']),
  featuredImage: z.string().max(2_000),
  imageAltText: z.string().max(300),
  isFeatured: z.boolean(),
  metaTitle: z.string().trim().max(180),
  metaDescription: z.string().trim().max(320),
  sourceName: z.string().trim().max(240),
  sourceUrl: z.string().trim().max(2_000),
  tags: z.array(z.string().trim().min(1).max(100)).max(40),
  relatedBrokers: z.array(slugSchema).max(80),
  linkedSources: z.array(z.object({
    label: z.string().trim().min(1).max(240),
    url: z.string().trim().min(1).max(2_000),
  })).max(40),
  editorNote: z.string().trim().max(4_000),
})

export async function saveAdminNewsPost(raw: unknown) {
  return run(async () => {
    const input = parseInput(ArticleInput, raw)
    const actor = await requireStaff('editorial:write')

    if (input.originalSlug && input.originalSlug !== input.slug) {
      throw new Err('Article slugs cannot change here; keep the existing URL stable.', 'validation')
    }
    if (!input.originalSlug && (getStaticPost(input.slug) || await getAdminNewsPost(input.slug))) {
      throw new Err('That article URL already exists. Open the existing article to edit it.', 'validation')
    }

    const [author, categories] = await Promise.all([
      getAdminEditorialAuthor(input.authorSlug),
      getAdminCategories(),
    ])
    if (!author || !author.isActive) throw new Err('Choose an active editorial author.', 'validation')
    if (!categories.some((category) => category.slug === input.category)) {
      throw new Err('Choose an existing category or create one first.', 'validation')
    }

    const publishedAt = new Date(input.publishedAt)
    if (Number.isNaN(publishedAt.getTime())) throw new Err('Choose a valid publication date.', 'validation')
    const content = sanitizeEditorialHtml(input.content)
    const wordCount = wordCountFor(content)
    if (input.status === 'published' && plainTextLength(content) < 60) {
      throw new Err('Published articles need at least 60 characters of body copy.', 'validation')
    }

    const featuredImage = safeImageUrl(input.featuredImage)
    const sourceUrl = safeSourceUrl(input.sourceUrl)
    const linkedSources = input.linkedSources.map((source) => ({
      label: source.label.trim(),
      url: safeSourceUrl(source.url) ?? '',
    }))
    if (linkedSources.some((source) => !source.url)) {
      throw new Err('Each additional source needs a valid URL.', 'validation')
    }
    const imageAltText = featuredImage ? input.imageAltText.trim() || input.title : null
    const storedStatus = input.status === 'draft' ? 'draft' : 'published'

    const saved = await queryOne<{ id: string }>(
      `INSERT INTO public.posts (
         slug, title, excerpt, content, category, editorial_type,
         author_name, author_slug, author_avatar, author_bio, author_role,
         featured_image, image_alt_text, is_featured, status, published_at,
         updated_at, reading_time, word_count, meta_title, meta_description,
         source_name, source_url, tags, related_brokers, linked_sources, editor_note
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         $12, $13, $14, $15, $16, now(), $17, $18, $19, $20,
         $21, $22, $23::text[], $24::text[], $25::jsonb, $26
       )
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         excerpt = EXCLUDED.excerpt,
         content = EXCLUDED.content,
         category = EXCLUDED.category,
         editorial_type = EXCLUDED.editorial_type,
         author_name = EXCLUDED.author_name,
         author_slug = EXCLUDED.author_slug,
         author_avatar = EXCLUDED.author_avatar,
         author_bio = EXCLUDED.author_bio,
         author_role = EXCLUDED.author_role,
         featured_image = EXCLUDED.featured_image,
         image_alt_text = EXCLUDED.image_alt_text,
         is_featured = EXCLUDED.is_featured,
         status = EXCLUDED.status,
         published_at = EXCLUDED.published_at,
         updated_at = now(),
         reading_time = EXCLUDED.reading_time,
         word_count = EXCLUDED.word_count,
         meta_title = EXCLUDED.meta_title,
         meta_description = EXCLUDED.meta_description,
         source_name = EXCLUDED.source_name,
         source_url = EXCLUDED.source_url,
         tags = EXCLUDED.tags,
         related_brokers = EXCLUDED.related_brokers,
         linked_sources = EXCLUDED.linked_sources,
         editor_note = EXCLUDED.editor_note
       RETURNING id::text AS id`,
      [
        input.slug,
        input.title,
        input.excerpt,
        content,
        input.category,
        input.editorialType,
        author.name,
        author.slug,
        author.avatar ?? null,
        author.bio ?? null,
        author.role ?? null,
        featuredImage,
        imageAltText,
        input.isFeatured,
        storedStatus,
        publishedAt.toISOString(),
        wordCount > 0 ? `${Math.max(1, Math.ceil(wordCount / 220))} min read` : null,
        wordCount,
        input.metaTitle || null,
        input.metaDescription || null,
        input.sourceName || null,
        sourceUrl,
        input.tags.map((tag) => tag.trim()).filter(Boolean),
        input.relatedBrokers,
        JSON.stringify(linkedSources),
        input.editorNote || null,
      ],
    )

    await audit(actor, null, input.status === 'published' ? 'news.publish' : 'admin.news.save', input.slug, {
      status: storedStatus,
      fields: ['title', 'content', 'category', 'author', 'sources', 'image', 'schedule'],
    })
    revalidateEditorialRoutes(input.slug)
    return { id: saved?.id ?? input.slug, slug: input.slug, status: input.status, publishedAt: publishedAt.toISOString() }
  })
}

const AuthorInput = z.object({
  originalSlug: slugSchema.nullable().optional(),
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().max(160),
  bio: z.string().trim().max(3_000),
  avatar: z.string().trim().max(2_000),
  beat: z.array(z.string().trim().min(1).max(100)).max(30),
  sameAs: z.array(z.string().trim().min(1).max(2_000)).max(20),
  isActive: z.boolean(),
})

export async function saveAdminEditorialAuthor(raw: unknown) {
  return run(async () => {
    const input = parseInput(AuthorInput, raw)
    const actor = await requireStaff('editorial:write')
    if (input.originalSlug && input.originalSlug !== input.slug) {
      throw new Err('Author slugs cannot change because they are part of public URLs.', 'validation')
    }
    if (!input.originalSlug && getStaticAuthorSlug(input.slug)) {
      throw new Err('That author already exists. Open the existing profile to edit it.', 'validation')
    }

    const existing = input.originalSlug ? await getAdminEditorialAuthor(input.originalSlug) : undefined
    if (input.originalSlug && !existing) throw new Err('Author not found.', 'not_found')
    const duplicate = input.originalSlug
      ? null
      : await queryOne<{ slug: string }>(`SELECT slug FROM public.editorial_authors WHERE slug = $1 LIMIT 1`, [input.slug])
    if (duplicate) throw new Err('That author slug is already in use.', 'validation')

    const avatar = safeImageUrl(input.avatar)
    const sameAs = input.sameAs.map((value) => safeSourceUrl(value) ?? '')
    if (sameAs.some((value) => !value)) throw new Err('Profile links must use HTTP or HTTPS.', 'validation')

    await query(
      `INSERT INTO public.editorial_authors
         (slug, name, role, bio, avatar, beat, same_as, is_active, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::text[], $7::text[], $8, $9, now())
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         bio = EXCLUDED.bio,
         avatar = EXCLUDED.avatar,
         beat = EXCLUDED.beat,
         same_as = EXCLUDED.same_as,
         is_active = EXCLUDED.is_active,
         updated_by = EXCLUDED.updated_by,
         updated_at = now()`,
      [input.slug, input.name, input.role, input.bio, avatar, input.beat, sameAs, input.isActive, actor.id],
    )
    await audit(actor, null, 'admin.author.save', input.slug, { active: input.isActive })
    revalidateEditorialRoutes()
    return { slug: input.slug, saved: true }
  })
}

const CategoryInput = z.object({
  originalSlug: slugSchema.nullable().optional(),
  slug: slugSchema,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500),
})

export async function saveAdminCategory(raw: unknown) {
  return run(async () => {
    const input = parseInput(CategoryInput, raw)
    const actor = await requireStaff('editorial:write')
    if (input.originalSlug && input.originalSlug !== input.slug) {
      throw new Err('Category slugs cannot change while article URLs and archives depend on them.', 'validation')
    }
    const categories = await getAdminCategories()
    if (input.originalSlug && !categories.some((category) => category.slug === input.originalSlug)) {
      throw new Err('Category not found.', 'not_found')
    }
    if (!input.originalSlug && categories.some((category) => category.slug === input.slug)) {
      throw new Err('That category already exists. Edit it from the list instead.', 'validation')
    }

    await query(
      `INSERT INTO public.categories (slug, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description`,
      [input.slug, input.name, input.description],
    )
    await audit(actor, null, 'admin.category.save', input.slug, { name: input.name })
    revalidateEditorialRoutes()
    return { slug: input.slug, saved: true }
  })
}

const EditorialContentInput = z.object({
  kind: z.enum(['learn_page', 'glossary_term', 'corrections_policy']),
  originalSlug: slugSchema.nullable().optional(),
  slug: slugSchema,
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().max(800),
  content: z.string().max(500_000),
  status: z.enum(['draft', 'published', 'coming_soon']),
  metaTitle: z.string().trim().max(180),
  metaDescription: z.string().trim().max(320),
  relatedTerms: z.array(slugSchema).max(80),
  sortOrder: z.number().int().min(0).max(100_000),
})

export async function saveAdminEditorialContent(raw: unknown) {
  return run(async () => {
    const input = parseInput(EditorialContentInput, raw)
    const actor = await requireStaff('editorial:write')
    const kind = input.kind as EditorialContentKind
    if (input.originalSlug && input.originalSlug !== input.slug) {
      throw new Err('Content slugs cannot change because public URLs depend on them.', 'validation')
    }
    if (kind === 'corrections_policy' && input.status !== 'published') {
      throw new Err('Keep the corrections policy published so readers can always access it.', 'validation')
    }
    if (input.originalSlug) {
      const existing = (await getAdminEditorialContentEntries(kind)).some((entry) => entry.slug === input.originalSlug)
      if (!existing) throw new Err('Editorial page not found.', 'not_found')
    } else if (hasDefaultEditorialContent(kind, input.slug)) {
      throw new Err('That page already exists. Open it from the list to edit it.', 'validation')
    }

    const validTermSlugs = new Set(
      (await getAdminEditorialContentEntries('glossary_term')).map((entry) => entry.slug),
    )
    if (input.relatedTerms.some((slug) => !validTermSlugs.has(slug))) {
      throw new Err('Related terms must match an existing glossary entry.', 'validation')
    }

    const content = sanitizeEditorialHtml(input.content)
    const plainLength = plainTextLength(content)
    if (
      input.status === 'published' &&
      ((kind === 'glossary_term' && plainLength === 0) ||
        (kind === 'learn_page' && !['index', 'glossary'].includes(input.slug) && plainLength === 0) ||
        (kind === 'corrections_policy' && plainLength === 0))
    ) {
      throw new Err('Published content needs body copy before it can go live.', 'validation')
    }

    await query(
      `INSERT INTO public.editorial_content
         (kind, slug, title, summary, content, status, meta_title,
          meta_description, related_terms, sort_order, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, now())
       ON CONFLICT (kind, slug) DO UPDATE SET
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         content = EXCLUDED.content,
         status = EXCLUDED.status,
         meta_title = EXCLUDED.meta_title,
         meta_description = EXCLUDED.meta_description,
         related_terms = EXCLUDED.related_terms,
         sort_order = EXCLUDED.sort_order,
         updated_by = EXCLUDED.updated_by,
         updated_at = now()`,
      [
        kind,
        input.slug,
        input.title,
        input.summary,
        content,
        input.status,
        input.metaTitle || null,
        input.metaDescription || null,
        input.relatedTerms,
        input.sortOrder,
        actor.id,
      ],
    )
    await audit(actor, null, 'admin.learning.save', `${kind}:${input.slug}`, { status: input.status })
    revalidateLearningRoutes()
    return { kind, slug: input.slug, saved: true }
  })
}

function imageFamily(buffer: Buffer): 'png' | 'jpeg' | 'webp' | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return null
}

export async function uploadEditorialImage(formData: FormData) {
  return run(async () => {
    const actor = await requireStaff('editorial:write')
    const file = formData.get('file')
    if (!(file instanceof File)) throw new Err('Choose an image file to upload.', 'validation')
    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      throw new Err('Images must be 10 MB or smaller.', 'validation')
    }

    const original = Buffer.from(await file.arrayBuffer())
    const family = imageFamily(original)
    if (!family || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      throw new Err('Upload a valid PNG, JPEG, or WebP image.', 'validation')
    }

    const pipeline = sharp(original, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate()
    const metadata = await pipeline.metadata()
    if (!metadata.width || !metadata.height) throw new Err('The image dimensions could not be read.', 'validation')
    const optimized = await pipeline
      .resize({ width: 2_400, height: 2_400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer()

    const pathname = `editorial/${randomUUID()}.webp`
    const blob = await put(pathname, optimized, {
      token: getVerifiedBlobToken(),
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
    })
    await audit(actor, null, 'media.upload', pathname, { bytes: optimized.length, format: family })
    return { url: blob.url, pathname }
  })
}
