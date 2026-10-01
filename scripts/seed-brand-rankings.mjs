/**
 * scripts/seed-brand-rankings.mjs
 *
 * Reads master-ranking.csv and upserts every row into public.brands:
 *   - display_rank, brand_category, brand_status, regulator_tier
 *   - internal_notes, internal_priority, needs_manual_review
 *
 * Preserves: verification_status, is_sponsored, is_featured, is_claimed
 * (never downgraded by this script).
 *
 * Duplicate slugs (same slug appearing more than once in the CSV) —
 * only the FIRST occurrence (lowest rank number) is upserted.
 *
 * Usage:
 *   VERCEL_ENV=development node scripts/seed-brand-rankings.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { neon } from '@neondatabase/serverless'
import { resolveDatabaseTarget } from '../lib/database-safety.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const { connectionString } = resolveDatabaseTarget()
const sql = neon(connectionString)

// ─── Parse CSV ───────────────────────────────────────────────────────────────

function parseCsvLine(line) {
  const fields = []
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

const csvPath = resolve(__dirname, 'master-ranking.csv')
const lines = readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean)
const header = parseCsvLine(lines[0])
const colIdx = Object.fromEntries(header.map((h, i) => [h.trim(), i]))

const seenSlugs = new Set()
const rows = []

for (let i = 1; i < lines.length; i++) {
  const fields = parseCsvLine(lines[i])
  const slug = fields[colIdx['slug_if_provided']]?.trim()
  if (!slug) continue
  if (seenSlugs.has(slug)) {
    // Duplicate slug — skip (first occurrence wins = lowest rank)
    console.warn(`[skip] duplicate slug: ${slug} (rank ${fields[colIdx['rank']]})`)
    continue
  }
  seenSlugs.add(slug)
  rows.push({
    rank: parseInt(fields[colIdx['rank']], 10),
    name: fields[colIdx['brand_name']]?.trim() ?? '',
    slug,
    category: fields[colIdx['category']]?.trim() ?? '',
    status: fields[colIdx['status']]?.trim() ?? '',
    regulator_tier: fields[colIdx['regulator_tier']]?.trim() ?? '',
    confidence: fields[colIdx['confidence']]?.trim() ?? '',
    est_band: fields[colIdx['est_popularity_band']]?.trim() ?? '',
    prominence: fields[colIdx['prominence_evidence']]?.trim() ?? '',
    score: fields[colIdx['internal_priority_score']]?.trim() ?? '',
    review: (fields[colIdx['needs_manual_review']]?.trim().toUpperCase() === 'TRUE'),
    notes: fields[colIdx['notes']]?.trim() ?? '',
  })
}

console.log(`Parsed ${rows.length} unique slugs from CSV`)

// ─── Upsert in batches ────────────────────────────────────────────────────────

const BATCH = 100

async function upsertBatch(batch) {
  // Build parameterised VALUES: each row = 10 params
  const valuePlaceholders = batch.map((_, i) => {
    const base = i * 10
    return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10})`
  }).join(',\n  ')

  const params = batch.flatMap(r => [
    r.slug,
    r.name,
    r.category,
    r.status,
    r.regulator_tier,
    r.rank,
    r.review,
    r.notes || null,
    JSON.stringify({ prominence: r.prominence, confidence: r.confidence, est_band: r.est_band }),
    r.score || null,
  ])

  await sql(
    `INSERT INTO public.brands
       (slug, name, brand_category, brand_status, regulator_tier,
        display_rank, needs_manual_review, internal_notes, internal_priority, updated_at)
     VALUES ${valuePlaceholders}
     ON CONFLICT (slug) DO UPDATE SET
       name                = EXCLUDED.name,
       brand_category      = EXCLUDED.brand_category,
       brand_status        = EXCLUDED.brand_status,
       regulator_tier      = EXCLUDED.regulator_tier,
       display_rank        = EXCLUDED.display_rank,
       needs_manual_review = EXCLUDED.needs_manual_review,
       internal_notes      = EXCLUDED.internal_notes,
       internal_priority   = EXCLUDED.internal_priority,
       updated_at          = now()`,
    params,
  )
}

let done = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  await upsertBatch(batch)
  done += batch.length
  console.log(`  upserted ${done}/${rows.length}`)
}

console.log('Done. All brand rankings seeded.')
