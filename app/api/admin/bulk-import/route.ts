import { type NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/portal/db'
import { SECTION_KEYS, type SectionKey } from '@/lib/content/registry'
import { revalidateBrand } from '@/lib/portal/revalidate'
import { requireAdmin } from '@/lib/guards'

export interface ImportRowResult {
  slug: string
  status: 'ok' | 'skipped' | 'error'
  sectionsWritten: number
  unknownSections: string[]
  message?: string
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify the caller is an authenticated admin via session cookie.
  let adminId: string
  try {
    const admin = await requireAdmin()
    adminId = admin.id
  } catch {
    return NextResponse.json({ error: 'Unauthorised — please log in as admin' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    return NextResponse.json({ error: 'Expected a non-empty JSON array' }, { status: 400 })
  }
  if (payload.length > 2000) {
    return NextResponse.json({ error: 'Maximum 2,000 entries per request' }, { status: 400 })
  }

  const pool = getPool()
  const results: ImportRowResult[] = []
  const SECTION_SET = new Set<string>(SECTION_KEYS)

  // Process rows sequentially to avoid overwhelming the connection pool.
  for (const row of payload) {
    if (!row || typeof row !== 'object' || typeof (row as Record<string, unknown>).slug !== 'string') {
      results.push({ slug: '?', status: 'error', sectionsWritten: 0, unknownSections: [], message: 'Missing slug' })
      continue
    }

    const entry = row as Record<string, unknown>
    const slug = (entry.slug as string).trim().toLowerCase()
    const unknownSections: string[] = []

    // Resolve brand_id
    const brandRes = await pool.query<{ id: string }>(
      `SELECT id FROM public.brands WHERE slug = $1 LIMIT 1`,
      [slug],
    )
    if (brandRes.rows.length === 0) {
      results.push({ slug, status: 'skipped', sectionsWritten: 0, unknownSections: [], message: 'Brand not found in public.brands' })
      continue
    }
    const brandId = brandRes.rows[0].id

    // Collect section keys from the row (everything except 'slug')
    const sectionEntries: Array<{ key: SectionKey; content: Record<string, unknown> }> = []
    for (const [k, v] of Object.entries(entry)) {
      if (k === 'slug') continue
      if (!SECTION_SET.has(k)) { unknownSections.push(k); continue }
      if (!v || typeof v !== 'object' || Array.isArray(v)) { unknownSections.push(`${k}(bad type)`); continue }
      sectionEntries.push({ key: k as SectionKey, content: v as Record<string, unknown> })
    }

    if (sectionEntries.length === 0) {
      results.push({ slug, status: 'skipped', sectionsWritten: 0, unknownSections, message: 'No valid sections provided' })
      continue
    }

    // Upsert each section into broker_page_sections AND public_broker_sections
    let written = 0
    try {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const now = new Date().toISOString()

        for (const { key, content } of sectionEntries) {
          const jsonContent = JSON.stringify(content)

          // broker_page_sections (portal draft + published)
          // status must be one of: 'synced', 'draft', 'pending_review'
          // 'synced' means draft === published, which is correct for a bulk import.
          await client.query(`
            INSERT INTO public.broker_page_sections
              (brand_id, section_key, draft, published, status, version, published_at, updated_at, updated_by)
            VALUES ($1, $2, $3::jsonb, $3::jsonb, 'synced', 1, $4, $4, $5)
            ON CONFLICT (brand_id, section_key) DO UPDATE
              SET draft        = EXCLUDED.draft,
                  published    = EXCLUDED.published,
                  status       = 'synced',
                  version      = broker_page_sections.version + 1,
                  published_at = EXCLUDED.published_at,
                  updated_at   = EXCLUDED.updated_at,
                  updated_by   = EXCLUDED.updated_by
          `, [brandId, key, jsonContent, now, adminId])

          written++
        }

        // section_versions audit trail
        // source must be one of: 'publish', 'rollback', 'moderation', 'admin_edit'
        for (const { key, content } of sectionEntries) {
          await client.query(`
            INSERT INTO public.section_versions (brand_id, section_key, content, source, created_by)
            VALUES ($1, $2, $3::jsonb, 'admin_edit', $4)
          `, [brandId, key, JSON.stringify(content), adminId])
        }

        await client.query('COMMIT')
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }

      // Bust ISR cache for this brand
      revalidateBrand(slug)

      results.push({ slug, status: 'ok', sectionsWritten: written, unknownSections })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ slug, status: 'error', sectionsWritten: 0, unknownSections, message: msg })
    }
  }

  const ok = results.filter((r) => r.status === 'ok').length
  const skipped = results.filter((r) => r.status === 'skipped').length
  const errors = results.filter((r) => r.status === 'error').length

  return NextResponse.json({ ok, skipped, errors, results })
}
