/**
 * scripts/seed-posts.mjs
 *
 * Seeds the public.posts Neon table from the canonical data/posts.ts source.
 * Safe to re-run: uses INSERT ... ON CONFLICT (slug) DO UPDATE so existing
 * rows are refreshed (content edits pick up) and missing rows are inserted.
 *
 * Run from the project root:
 *   node --experimental-vm-modules scripts/seed-posts.mjs
 *
 * Requires POSTGRES_URL or DATABASE_URL in the environment (or .env.local).
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// ─── Load .env.local if present ────────────────────────────────────────────
try {
  const envPath = resolve(projectRoot, '.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
  console.log('[seed] Loaded .env.local')
} catch {
  console.log('[seed] No .env.local found, using environment variables directly')
}

// ─── Connect to Neon ────────────────────────────────────────────────────────
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error('[seed] ERROR: POSTGRES_URL or DATABASE_URL environment variable is not set')
  process.exit(1)
}

const { neon } = await import('@neondatabase/serverless')
const sql = neon(connectionString)

// ─── Load posts from the TypeScript source via a build step ─────────────────
// We compile posts.ts on-the-fly using esbuild (already a project dep) so we
// can seed from the single source of truth without duplicating data.
const esbuild = await import('esbuild')

const postsSource = resolve(projectRoot, 'data/posts.ts')
const typesSource = resolve(projectRoot, 'lib/types.ts')

const { outputFiles } = await esbuild.build({
  entryPoints: [postsSource],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  // Externalize everything that isn't pure TS data so esbuild doesn't need
  // to resolve React, Next.js, etc.
  packages: 'external',
  alias: { '@/lib/types': typesSource },
  // Suppress "use client" directives that would confuse esbuild
  banner: { js: '// esbuild seed bundle' },
})

// Write to a temp file and import it
import { writeFileSync, unlinkSync } from 'fs'
const tmpPath = resolve(projectRoot, '.seed-posts-tmp.mjs')
writeFileSync(tmpPath, outputFiles[0].text)

let posts
try {
  const mod = await import(tmpPath)
  posts = mod.posts
} finally {
  try { unlinkSync(tmpPath) } catch {}
}

if (!posts || !Array.isArray(posts)) {
  console.error('[seed] ERROR: Could not load posts array from data/posts.ts')
  process.exit(1)
}

console.log(`[seed] Loaded ${posts.length} posts from data/posts.ts`)

// ─── Upsert each post ────────────────────────────────────────────────────────
let inserted = 0
let updated = 0
let errors = 0

for (const post of posts) {
  try {
    const result = await sql`
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
        ${post.author?.avatar ?? null},
        ${post.author?.bio ?? null},
        ${post.author?.role ?? null},
        ${post.featuredImage ?? null},
        ${post.imageAltText ?? null},
        ${post.isFeatured ?? false},
        ${post.publishedAt},
        ${post.updatedAt ?? post.publishedAt},
        ${post.readingTime ?? null},
        ${post.wordCount ?? null},
        ${post.metaTitle ?? null},
        ${post.metaDescription ?? null},
        ${post.sourceName ?? null},
        ${post.tags ?? null},
        ${post.relatedBrokers ?? null},
        ${JSON.stringify(post.linkedSources ?? [])}::jsonb,
        'published'
      )
      ON CONFLICT (slug) DO UPDATE SET
        title           = EXCLUDED.title,
        excerpt         = EXCLUDED.excerpt,
        content         = EXCLUDED.content,
        category        = EXCLUDED.category,
        editorial_type  = EXCLUDED.editorial_type,
        author_name     = EXCLUDED.author_name,
        author_slug     = EXCLUDED.author_slug,
        author_avatar   = EXCLUDED.author_avatar,
        author_bio      = EXCLUDED.author_bio,
        author_role     = EXCLUDED.author_role,
        featured_image  = EXCLUDED.featured_image,
        image_alt_text  = EXCLUDED.image_alt_text,
        is_featured     = EXCLUDED.is_featured,
        published_at    = EXCLUDED.published_at,
        updated_at      = EXCLUDED.updated_at,
        reading_time    = EXCLUDED.reading_time,
        word_count      = EXCLUDED.word_count,
        meta_title       = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        source_name      = EXCLUDED.source_name,
        tags             = EXCLUDED.tags,
        related_brokers = EXCLUDED.related_brokers,
        linked_sources  = EXCLUDED.linked_sources,
        status          = EXCLUDED.status
      RETURNING (xmax = 0) AS is_insert
    `
    if (result[0]?.is_insert) {
      inserted++
      console.log(`[seed] + inserted: ${post.slug} (${post.publishedAt})`)
    } else {
      updated++
      console.log(`[seed] ~ updated:  ${post.slug} (${post.publishedAt})`)
    }
  } catch (err) {
    errors++
    console.error(`[seed] ERROR on ${post.slug}:`, err.message)
  }
}

const expectedSlugs = posts.map((post) => post.slug)
const duplicateSlugs = expectedSlugs.filter(
  (slug, index) => expectedSlugs.indexOf(slug) !== index,
)

let missingSlugs = []
let unpublishedSlugs = []
let verificationError

try {
  const inventory = await sql`SELECT slug, status FROM public.posts`
  const rowsBySlug = new Map(inventory.map((row) => [row.slug, row.status]))
  missingSlugs = expectedSlugs.filter((slug) => !rowsBySlug.has(slug))
  unpublishedSlugs = expectedSlugs.filter(
    (slug) => rowsBySlug.get(slug) !== 'published',
  )
} catch (error) {
  verificationError = error instanceof Error ? error.message : String(error)
}

const failed =
  errors > 0 ||
  duplicateSlugs.length > 0 ||
  missingSlugs.length > 0 ||
  unpublishedSlugs.length > 0 ||
  Boolean(verificationError)

console.log(
  `\n[seed] Done. ${inserted} inserted, ${updated} updated, ${errors} errors out of ${posts.length} posts.`,
)
console.log(
  `[seed] Inventory verification: ${failed ? 'FAILED' : 'passed'} (${posts.length - missingSlugs.length}/${posts.length} expected slugs present).`,
)
if (duplicateSlugs.length) console.error('[seed] Duplicate source slugs:', [...new Set(duplicateSlugs)])
if (missingSlugs.length) console.error('[seed] Missing database slugs:', missingSlugs)
if (unpublishedSlugs.length) console.error('[seed] Unpublished database slugs:', unpublishedSlugs)
if (verificationError) console.error('[seed] Verification query failed:', verificationError)
if (failed) process.exit(1)
