/**
 * POST /api/admin/seed-posts
 *
 * Seeds the public.posts Neon table from data/posts.ts.
 * Protected by a SEED_SECRET header so it can be called from the browser or
 * via `curl` without exposing a public write endpoint.
 *
 * Usage (from browser DevTools on the live site):
 *   fetch('/api/admin/seed-posts', {
 *     method: 'POST',
 *     headers: { 'x-seed-secret': '<value of SEED_SECRET env var>' }
 *   }).then(r => r.json()).then(console.log)
 *
 * Or deploy and hit it once via Vercel's "Run" tab in Functions.
 *
 * Safe to re-run: INSERT … ON CONFLICT (slug) DO UPDATE refreshes existing rows.
 */

import { posts as allPosts } from '@/data/posts'
import { sql } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { revalidateNewsSurfaces } from '@/lib/news-revalidation'
import { scheduleNewsFeedUpdate } from '@/lib/news-websub'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  // In development the secret check is bypassed so seeding can be triggered
  // from the v0 sandbox without needing SEED_SECRET in .env.development.local.
  // On production (NODE_ENV === 'production'), SEED_SECRET is always required.
  const isDev = process.env.NODE_ENV !== 'production'
  const secret = process.env.SEED_SECRET
  if (!isDev) {
    if (!secret) {
      return Response.json({ error: 'SEED_SECRET env var not set on this deployment' }, { status: 500 })
    }
    const provided = req.headers.get('x-seed-secret')
    if (provided !== secret) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // ── Seed ───────────────────────────────────────────────────────────────────
  const results: { slug: string; op: 'inserted' | 'updated' | 'error'; detail?: string }[] = []

  for (const post of allPosts) {
    try {
      const rows = await sql`
        INSERT INTO public.posts (
          slug,
          title,
          excerpt,
          content,
          category,
          editorial_type,
          author_name,
          author_slug,
          author_avatar,
          author_bio,
          author_role,
          featured_image,
          image_alt_text,
          is_featured,
          published_at,
          updated_at,
          reading_time,
          word_count,
          meta_title,
          meta_description,
          source_name,
          tags,
          related_brokers,
          linked_sources,
          status
        ) VALUES (
          ${post.slug},
          ${post.title},
          ${post.excerpt},
          ${post.content ?? null},
          ${post.category},
          ${post.editorialType ?? null},
          ${post.author?.name ?? null},
          ${post.author?.slug ?? null},
          ${(post.author as any)?.avatar ?? null},
          ${(post.author as any)?.bio ?? null},
          ${(post.author as any)?.role ?? null},
          ${post.featuredImage ?? null},
          ${(post as any).imageAltText ?? null},
          ${post.isFeatured ?? false},
          ${post.publishedAt},
          ${post.updatedAt ?? post.publishedAt},
          ${post.readingTime ?? null},
          ${(post as any).wordCount ?? null},
          ${post.metaTitle ?? null},
          ${post.metaDescription ?? null},
          ${post.sourceName ?? null},
          ${post.tags ?? null},
          ${post.relatedBrokers ?? null},
          ${JSON.stringify(post.linkedSources ?? [])}::jsonb,
          'published'
        )
        ON CONFLICT (slug) DO UPDATE SET
          title            = EXCLUDED.title,
          excerpt          = EXCLUDED.excerpt,
          content          = EXCLUDED.content,
          category         = EXCLUDED.category,
          editorial_type   = EXCLUDED.editorial_type,
          author_name      = EXCLUDED.author_name,
          author_slug      = EXCLUDED.author_slug,
          author_avatar    = EXCLUDED.author_avatar,
          author_bio       = EXCLUDED.author_bio,
          author_role      = EXCLUDED.author_role,
          featured_image   = EXCLUDED.featured_image,
          image_alt_text   = EXCLUDED.image_alt_text,
          is_featured      = EXCLUDED.is_featured,
          published_at     = EXCLUDED.published_at,
          updated_at       = EXCLUDED.updated_at,
          reading_time     = EXCLUDED.reading_time,
          word_count       = EXCLUDED.word_count,
          meta_title       = EXCLUDED.meta_title,
          meta_description = EXCLUDED.meta_description,
          source_name      = EXCLUDED.source_name,
          tags             = EXCLUDED.tags,
          related_brokers  = EXCLUDED.related_brokers,
          linked_sources   = EXCLUDED.linked_sources,
          status           = EXCLUDED.status
        RETURNING (xmax = 0) AS is_insert
      `
      results.push({
        slug: post.slug,
        op: rows[0]?.is_insert ? 'inserted' : 'updated',
      })
    } catch (err: any) {
      results.push({ slug: post.slug, op: 'error', detail: err.message })
    }
  }

  const inserted = results.filter((result) => result.op === 'inserted').length
  const updated = results.filter((result) => result.op === 'updated').length
  const errors = results.filter((result) => result.op === 'error')
  const expectedSlugs = allPosts.map((post) => post.slug)
  const duplicateSlugs = expectedSlugs.filter(
    (slug, index) => expectedSlugs.indexOf(slug) !== index,
  )

  let missingSlugs: string[] = []
  let unpublishedSlugs: string[] = []
  let verificationError: string | undefined

  try {
    const inventory = await sql`
      SELECT slug, status
      FROM public.posts
    `
    const rowsBySlug = new Map(
      inventory.map((row) => [row.slug as string, row.status as string | null]),
    )
    missingSlugs = expectedSlugs.filter((slug) => !rowsBySlug.has(slug))
    unpublishedSlugs = expectedSlugs.filter(
      (slug) => rowsBySlug.get(slug) !== 'published',
    )
  } catch (error) {
    verificationError = error instanceof Error ? error.message : String(error)
  }

  if (!verificationError) {
    revalidateNewsSurfaces()
    if (inserted > 0 || updated > 0) {
      scheduleNewsFeedUpdate()
    }
  }

  const failed =
    errors.length > 0 ||
    duplicateSlugs.length > 0 ||
    missingSlugs.length > 0 ||
    unpublishedSlugs.length > 0 ||
    Boolean(verificationError)

  return Response.json(
    {
      total: allPosts.length,
      inserted,
      updated,
      errors: errors.length,
      errorDetails: errors,
      verified: !failed,
      duplicateSlugs: [...new Set(duplicateSlugs)],
      missingSlugs,
      unpublishedSlugs,
      verificationError,
      results,
    },
    { status: failed ? 500 : 200 },
  )
}
