/**
 * POST /api/admin/seed-brands-ranking
 *
 * Reads scripts/master-ranking.csv and upserts every row into public.brands:
 *   display_rank, brand_category, brand_status, regulator_tier,
 *   internal_notes, internal_priority, needs_manual_review, name,
 *   rating_score (from internal_priority_score column)
 *
 * PRESERVES: verification_status, is_sponsored, is_featured, is_claimed
 * (these are never downgraded by this seed).
 *
 * Protected by SEED_SECRET env var in production.
 */
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { sql } from '@/lib/db'

const DEV = process.env.NODE_ENV === 'development'

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  if (!DEV) {
    const secret = req.headers.get('x-seed-secret') ?? req.nextUrl.searchParams.get('secret')
    if (!secret || secret !== process.env.SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Read CSV
  const csvPath = resolve(process.cwd(), 'scripts', 'master-ranking.csv')
  let csvText: string
  try {
    csvText = readFileSync(csvPath, 'utf-8')
  } catch {
    return NextResponse.json({ error: 'CSV file not found at scripts/master-ranking.csv' }, { status: 500 })
  }

  const lines = csvText.split('\n').filter(Boolean)
  const header = parseCsvLine(lines[0])
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]))

  type Row = {
    slug: string
    name: string
    rank: number
    category: string
    status: string
    regulatorTier: string
    confidence: string
    estBand: string
    prominence: string
    score: string        // internal_priority_score → becomes rating_score
    review: boolean
    notes: string
    isDuplicate: boolean // TRUE for second+ occurrences of the same slug
  }

  const seenSlugs = new Set<string>()
  const rows: Row[] = []

  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i])
    const slug = f[idx['slug_if_provided']]?.trim()
    if (!slug) continue

    const isDuplicate = seenSlugs.has(slug)
    seenSlugs.add(slug)

    rows.push({
      slug,
      name: f[idx['brand_name']]?.trim() ?? '',
      rank: parseInt(f[idx['rank']], 10),
      category: f[idx['category']]?.trim() ?? '',
      status: f[idx['status']]?.trim() ?? '',
      regulatorTier: f[idx['regulator_tier']]?.trim() ?? '',
      confidence: f[idx['confidence']]?.trim() ?? '',
      estBand: f[idx['est_popularity_band']]?.trim() ?? '',
      prominence: f[idx['prominence_evidence']]?.trim() ?? '',
      score: f[idx['internal_priority_score']]?.trim() ?? '',
      review: f[idx['needs_manual_review']]?.trim().toUpperCase() === 'TRUE',
      notes: f[idx['notes']]?.trim() ?? '',
      isDuplicate,
    })
  }

  // These are slugs that appear a second time in the CSV (country-specific
  // variants that were merged). We log them but do NOT mark them as duplicates
  // in the DB — the canonical entry is the first occurrence and is fine.
  const csvDuplicateSlugs = rows.filter(r => r.isDuplicate).map(r => r.slug)

  // Only upsert the primary (first-occurrence) rows from the CSV.
  const primaryRows = rows.filter(r => !r.isDuplicate)

  // ── Upsert primary rows in batches of 50 ────────────────────────────────
  const BATCH = 50
  let done = 0

  for (let i = 0; i < primaryRows.length; i += BATCH) {
    const batch = primaryRows.slice(i, i + BATCH)

    const slugs        = batch.map(r => r.slug)
    const names        = batch.map(r => r.name)
    const ranks        = batch.map(r => r.rank)
    const categories   = batch.map(r => r.category)
    const statuses     = batch.map(r => r.status)
    const regTiers     = batch.map(r => r.regulatorTier)
    const reviews      = batch.map(r => r.review)
    const notes        = batch.map(r => r.notes || null)
    const priorities   = batch.map(r => r.score || null)
    const ratingScores = batch.map(r => {
      const n = parseFloat(r.score)
      return isNaN(n) ? null : String(n)
    })

    await sql`
      INSERT INTO public.brands
        (slug, name, display_rank, brand_category, brand_status, regulator_tier,
         needs_manual_review, internal_notes, internal_priority,
         rating_score, is_duplicate, updated_at)
      SELECT
        u.slug, u.name, u.rank::int, u.cat, u.status, u.tier,
        u.review::boolean, u.notes, u.priority,
        u.rs::numeric, false, now()
      FROM unnest(
        ${slugs}::text[],
        ${names}::text[],
        ${ranks}::text[],
        ${categories}::text[],
        ${statuses}::text[],
        ${regTiers}::text[],
        ${reviews}::text[],
        ${notes}::text[],
        ${priorities}::text[],
        ${ratingScores}::text[]
      ) AS u(slug, name, rank, cat, status, tier, review, notes, priority, rs)
      ON CONFLICT (slug) DO UPDATE SET
        name                = EXCLUDED.name,
        display_rank        = EXCLUDED.display_rank,
        brand_category      = EXCLUDED.brand_category,
        brand_status        = EXCLUDED.brand_status,
        regulator_tier      = EXCLUDED.regulator_tier,
        needs_manual_review = EXCLUDED.needs_manual_review,
        internal_notes      = EXCLUDED.internal_notes,
        internal_priority   = EXCLUDED.internal_priority,
        rating_score        = EXCLUDED.rating_score,
        is_duplicate        = false,
        updated_at          = now()
    `
    done += batch.length
  }

  return NextResponse.json({
    ok: true,
    seeded: done,
    csvDuplicateCount: csvDuplicateSlugs.length,
  })
}
