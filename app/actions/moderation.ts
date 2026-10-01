'use server'

import { z } from 'zod'
import { run, Err } from '@/lib/portal/result'
import { requireStaff, requireStaffBrand } from '@/lib/guards'
import { query, queryOne } from '@/lib/portal/db'
import { audit } from '@/lib/audit'
import { revalidateBrand } from '@/lib/portal/revalidate'
import { sendEmail } from '@/lib/email/send'
import { del } from '@vercel/blob'
import { getVerifiedBlobToken } from '@/lib/blob-storage-safety'

/**
 * Admin moderation actions (Blueprint Sections 16.2 / 16.3).
 * approveItem / rejectItem apply the state-transition matrix per target type,
 * then close the queue row and write an audit entry. All writes go through the
 * shared pg pool. Every branch is admin-gated and requires the row to be
 * pending, so a double click can never re-apply a decision.
 */

interface QueueRow {
  id: string
  brand_id: string
  target_type: 'section' | 'offer' | 'media'
  target_id: string
  payload: Record<string, unknown> | null
  status: string
}

interface BrandRow {
  slug: string
  name: string
}

/** First member email for a brand, for approve/reject notifications. */
async function brandContact(brandId: string): Promise<string | null> {
  const row = await queryOne<{ email: string }>(
    `select p.email
       from public.brand_members m
       join public.profiles p on p.id = m.user_id
      where m.brand_id = $1
      order by m.created_at asc
      limit 1`,
    [brandId],
  )
  return row?.email ?? null
}

/** Human label for the queued target, used in emails and audit meta. */
function targetLabel(row: QueueRow): string {
  if (row.target_type === 'section') return `${row.target_id} section`
  if (row.target_type === 'offer') return 'promotional offer'
  return 'media asset'
}

async function loadPending(id: string): Promise<{ row: QueueRow; brand: BrandRow }> {
  const row = await queryOne<QueueRow>(
    `select id, brand_id, target_type, target_id, payload, status
       from public.moderation_queue where id = $1`,
    [id],
  )
  if (!row) throw new Err('Item not found', 'not_found')
  if (row.status !== 'pending') throw new Err('Already reviewed', 'validation')
  const brand = await queryOne<BrandRow>(`select slug, name from public.brands where id = $1`, [
    row.brand_id,
  ])
  if (!brand) throw new Err('Brand not found', 'not_found')
  return { row, brand }
}

/* ── Approve ──────────────────────────────────────────────────────────────── */

export async function approveItem(raw: unknown) {
  return run(async () => {
    const { id } = z.object({ id: z.string().uuid() }).parse(raw)
    const admin = await requireStaff('moderation:review')
    const { row, brand } = await loadPending(id)
    await requireStaffBrand(row.brand_id, 'moderation:review')

    if (row.target_type === 'section') {
      // Copy payload to published + draft, mark synced, snapshot the version.
      await query(
        `update public.broker_page_sections
            set published = $2::jsonb, draft = $2::jsonb, status = 'synced',
                version = version + 1, published_at = now(), updated_by = $3
          where brand_id = $1 and section_key = $4`,
        [row.brand_id, JSON.stringify(row.payload), admin.id, row.target_id],
      )
      await query(
        `insert into public.section_versions (brand_id, section_key, content, source, created_by)
         values ($1, $2, $3::jsonb, 'moderation', $4)`,
        [row.brand_id, row.target_id, JSON.stringify(row.payload), admin.id],
      )
    } else if (row.target_type === 'offer') {
      await query(`update public.offers set status = 'active', updated_at = now() where id = $1`, [
        row.target_id,
      ])
    } else {
      await query(`update public.media_assets set status = 'approved' where id = $1`, [
        row.target_id,
      ])
    }

    await query(
      `update public.moderation_queue
          set status = 'approved', reviewed_by = $2, reviewed_at = now()
        where id = $1`,
      [row.id, admin.id],
    )
    await audit(admin, row.brand_id, 'moderation.approve', row.target_id, {
      targetType: row.target_type,
    })
    revalidateBrand(brand.slug)

    const to = await brandContact(row.brand_id)
    if (to)
      await sendEmail('moderation-approved', to, {
        what: targetLabel(row),
        brandName: brand.name,
      })
    return {}
  })
}

/* ── Reject ───────────────────────────────────────────────────────────────── */

const RejectInput = z.object({
  id: z.string().uuid(),
  note: z.string().trim().min(1, 'A note is required').max(500),
})

export async function rejectItem(raw: unknown) {
  return run(async () => {
    const { id, note } = RejectInput.parse(raw)
    const admin = await requireStaff('moderation:review')
    const { row, brand } = await loadPending(id)
    await requireStaffBrand(row.brand_id, 'moderation:review')

    if (row.target_type === 'section') {
      // Payload stays in draft so the member can edit and resubmit.
      await query(
        `update public.broker_page_sections
            set status = 'draft', version = version + 1
          where brand_id = $1 and section_key = $2`,
        [row.brand_id, row.target_id],
      )
    } else if (row.target_type === 'offer') {
      await query(`update public.offers set status = 'rejected', updated_at = now() where id = $1`, [
        row.target_id,
      ])
    } else {
      // Delete the underlying object from Blob storage, then the row.
      const asset = await queryOne<{ public_url: string }>(
        `select public_url from public.media_assets where id = $1`,
        [row.target_id],
      )
      if (asset?.public_url) {
        const blobToken = getVerifiedBlobToken()
        try {
          await del(asset.public_url, { token: blobToken })
        } catch (err) {
          console.error('[v0] blob delete failed on media reject:', err)
        }
      }
      await query(`update public.media_assets set status = 'rejected' where id = $1`, [
        row.target_id,
      ])
    }

    await query(
      `update public.moderation_queue
          set status = 'rejected', reviewed_by = $2, reviewed_at = now(), review_note = $3
        where id = $1`,
      [row.id, admin.id, note],
    )
    await audit(admin, row.brand_id, 'moderation.reject', row.target_id, {
      targetType: row.target_type,
      note,
    })

    const to = await brandContact(row.brand_id)
    if (to) await sendEmail('moderation-rejected', to, { what: targetLabel(row), note })
    return {}
  })
}

/* ── Bulk approve clean items ─────────────────────────────────────────────── */

export async function bulkApproveClean() {
  return run(async () => {
    await requireStaff('moderation:review')
    const clean = await query<{ id: string }>(
      `select id from public.moderation_queue
        where status = 'pending' and (auto_flags = '[]'::jsonb or auto_flags is null)
        order by created_at asc`,
    )
    let approved = 0
    for (const { id } of clean) {
      const res = await approveItem({ id })
      if (res.ok) approved += 1
    }
    return { approved }
  })
}
