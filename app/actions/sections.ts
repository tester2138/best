'use server'

import { z } from 'zod'
import { run, Err } from '@/lib/portal/result'
import { requireBrandMember, requireStaffBrand } from '@/lib/guards'
import { query, queryOne } from '@/lib/portal/db'
import { zodFor } from '@/lib/content/schema'
import { SECTION_KEYS, SECTIONS } from '@/lib/content/registry'
import { sanitizeRich } from '@/lib/sanitize'
import { validateSectionUrls } from '@/lib/content/urlcheck'
import { rateLimit } from '@/lib/rate'
import { audit } from '@/lib/audit'
import { scanBanned } from '@/lib/banned'
import { revalidateBrand } from '@/lib/portal/revalidate'
import { sendEmail, adminDigestOnce } from '@/lib/email/send'
import type { Brand } from '@/types/portal'

interface SectionRow {
  id: string
  brand_id: string
  section_key: string
  draft: Record<string, unknown> | null
  published: Record<string, unknown> | null
  status: string
  version: number
}

/* ── 14.2 saveDraft ───────────────────────────────────────────────────────── */

const SaveInput = z.object({
  brandId: z.string().uuid(),
  sectionKey: z.enum(SECTION_KEYS),
  values: z.record(z.unknown()),
  version: z.number().int().min(0), // 0 = row does not exist yet
})

export async function saveDraft(raw: unknown) {
  return run(async () => {
    const input = SaveInput.parse(raw)
    const actor = await requireBrandMember(input.brandId, { write: true })
    if (!(await rateLimit('save', actor.id)).ok) throw new Err('Slow down a little', 'rate_limited')

    const parsed = zodFor(input.sectionKey).safeParse(input.values)
    if (!parsed.success)
      throw new Err('Fix the highlighted fields', 'validation', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
    const clean = parsed.data as Record<string, unknown>
    if (input.sectionKey === 'about' && typeof clean.body === 'string')
      clean.body = sanitizeRich(clean.body)
    validateSectionUrls(input.sectionKey, clean, actor.brand)

    if (input.version === 0) {
      // First save: insert. A unique-violation means a concurrent insert won —
      // the client reloads to pick up the server version.
      const inserted = await queryOne<{ version: number }>(
        `insert into public.broker_page_sections
           (brand_id, section_key, draft, status, version, updated_by)
         values ($1, $2, $3::jsonb, 'draft', 1, $4)
         on conflict (brand_id, section_key) do nothing
         returning version`,
        [input.brandId, input.sectionKey, JSON.stringify(clean), actor.id],
      )
      if (!inserted) throw new Err('This section changed elsewhere', 'version_conflict')
      await audit(actor, input.brandId, 'section.save', input.sectionKey, {
        fields: Object.keys(clean).length,
      })
      return { version: inserted.version }
    }

    // Optimistic lock: only update if version matches and not frozen in review.
    const updated = await queryOne<{ version: number }>(
      `update public.broker_page_sections
          set draft = $3::jsonb, updated_by = $4, status = 'draft', version = version + 1
        where brand_id = $1 and section_key = $2
          and version = $5 and status <> 'pending_review'
        returning version`,
      [input.brandId, input.sectionKey, JSON.stringify(clean), actor.id, input.version],
    )
    if (!updated) {
      const row = await queryOne<{ version: number; status: string }>(
        `select version, status from public.broker_page_sections
          where brand_id = $1 and section_key = $2`,
        [input.brandId, input.sectionKey],
      )
      if (row?.status === 'pending_review')
        throw new Err('This section is in review and cannot be edited', 'locked')
      throw new Err('This section changed elsewhere', 'version_conflict', {
        serverVersion: row?.version,
      })
    }
    await audit(actor, input.brandId, 'section.save', input.sectionKey, {
      fields: Object.keys(clean).length,
    })
    return { version: updated.version }
  })
}

/* ── 14.3 publishSection (also used by admin edit) ────────────────────────── */

const PublishInput = z.object({
  brandId: z.string().uuid(),
  sectionKey: z.enum(SECTION_KEYS),
  version: z.number().int().min(1),
  asAdmin: z.boolean().default(false),
})

export async function publishSection(raw: unknown) {
  return run(async () => {
    const input = PublishInput.parse(raw)
    const actor = input.asAdmin
      ? { ...(await requireStaffBrand(input.brandId, 'editorial:write')), brand: null as unknown as Brand }
      : await requireBrandMember(input.brandId, { write: true })

    const brand = await queryOne<Brand>(`select * from public.brands where id = $1`, [
      input.brandId,
    ])
    if (!brand) throw new Err('Not found', 'not_found')
    if (!input.asAdmin && !(await rateLimit('publish', input.brandId)).ok)
      throw new Err('Publish limit reached, try later', 'rate_limited')

    const row = await queryOne<SectionRow>(
      `select * from public.broker_page_sections where brand_id = $1 and section_key = $2`,
      [input.brandId, input.sectionKey],
    )
    if (!row?.draft) throw new Err('Nothing to publish', 'validation')
    if (row.version !== input.version)
      throw new Err('This section changed elsewhere', 'version_conflict', {
        serverVersion: row.version,
      })

    // Re-validate on the server — the stored draft is untrusted.
    const parsed = zodFor(input.sectionKey).safeParse(row.draft)
    if (!parsed.success) throw new Err('Draft is invalid, edit and retry', 'validation')
    const clean = parsed.data as Record<string, unknown>
    if (input.sectionKey === 'about' && typeof clean.body === 'string')
      clean.body = sanitizeRich(clean.body)
    if (input.sectionKey === 'company' && row.published?.admin_profile_overrides) {
      clean.admin_profile_overrides = row.published.admin_profile_overrides
    }
    validateSectionUrls(input.sectionKey, clean, brand)

    const settings = await queryOne<{ moderation_mode: string; banned_terms: string[] }>(
      `select moderation_mode, banned_terms from public.portal_settings where id = true`,
    )
    const flags = scanBanned(clean, settings?.banned_terms ?? [])
    const def = SECTIONS[input.sectionKey]
    const mode = settings?.moderation_mode ?? 'hybrid'
    const needsReview =
      !input.asAdmin && mode !== 'off' && (mode === 'all' || def.moderated || flags.length > 0)

    if (needsReview) {
      await query(
        `update public.broker_page_sections set status = 'pending_review', version = version + 1 where id = $1`,
        [row.id],
      )
      await query(
        `insert into public.moderation_queue
           (brand_id, target_type, target_id, payload, auto_flags, submitted_by)
         values ($1, 'section', $2, $3::jsonb, $4::jsonb, $5)`,
        [input.brandId, input.sectionKey, JSON.stringify(clean), JSON.stringify(flags), actor.id],
      )
      await audit(actor, input.brandId, 'section.publish', input.sectionKey, {
        queued: true,
        flags: flags.map((f) => f.detail),
      })
      await adminDigestOnce(input.brandId, brand.name)
      return { queued: true }
    }

    await query(
      `update public.broker_page_sections
          set published = $2::jsonb, draft = $2::jsonb, status = 'synced',
              version = version + 1, published_at = now(), updated_by = $3
        where id = $1`,
      [row.id, JSON.stringify(clean), actor.id],
    )
    await query(
      `insert into public.section_versions (brand_id, section_key, content, source, created_by)
       values ($1, $2, $3::jsonb, $4, $5)`,
      [
        input.brandId,
        input.sectionKey,
        JSON.stringify(clean),
        input.asAdmin ? 'admin_edit' : 'publish',
        actor.id,
      ],
    )
    await audit(
      actor,
      input.brandId,
      input.asAdmin ? 'admin.section.edit' : 'section.publish',
      input.sectionKey,
      { queued: false },
    )
    await revalidateBrand(brand.slug)
    return { queued: false }
  })
}

/* ── 14.4 discardDraft & rollbackVersion ──────────────────────────────────── */

export async function discardDraft(raw: unknown) {
  return run(async () => {
    const { brandId, sectionKey, version } = z
      .object({
        brandId: z.string().uuid(),
        sectionKey: z.enum(SECTION_KEYS),
        version: z.number().int(),
      })
      .parse(raw)
    const actor = await requireBrandMember(brandId, { write: true })

    const reverted = await queryOne<{ published: Record<string, unknown> | null }>(
      `update public.broker_page_sections
          set status = 'synced', version = version + 1
        where brand_id = $1 and section_key = $2 and version = $3 and status <> 'pending_review'
        returning published`,
      [brandId, sectionKey, version],
    )
    if (!reverted) throw new Err('Could not discard', 'version_conflict')
    // Reset the draft back to the published copy.
    await query(
      `update public.broker_page_sections set draft = $3::jsonb
        where brand_id = $1 and section_key = $2`,
      [brandId, sectionKey, JSON.stringify(reverted.published)],
    )
    await audit(actor, brandId, 'section.discard', sectionKey)
    return {}
  })
}

export async function rollbackVersion(raw: unknown) {
  return run(async () => {
    const { brandId, versionId } = z
      .object({ brandId: z.string().uuid(), versionId: z.number().int() })
      .parse(raw)
    const actor = await requireBrandMember(brandId, { write: true })

    const v = await queryOne<{ section_key: string; content: Record<string, unknown> }>(
      `select section_key, content from public.section_versions where id = $1 and brand_id = $2`,
      [versionId, brandId],
    )
    if (!v) throw new Err('Version not found', 'not_found')

    const updated = await queryOne<{ id: string }>(
      `update public.broker_page_sections
          set published = $3::jsonb, draft = $3::jsonb, status = 'synced',
              version = version + 1, published_at = now(), updated_by = $4
        where brand_id = $1 and section_key = $2
        returning id`,
      [brandId, v.section_key, JSON.stringify(v.content), actor.id],
    )
    if (!updated) throw new Err('Section not found', 'not_found')
    await query(
      `insert into public.section_versions (brand_id, section_key, content, source, created_by)
       values ($1, $2, $3::jsonb, 'rollback', $4)`,
      [brandId, v.section_key, JSON.stringify(v.content), actor.id],
    )
    await audit(actor, brandId, 'section.rollback', v.section_key, { from: versionId })
    await revalidateBrand(actor.brand.slug)
    return {}
  })
}
