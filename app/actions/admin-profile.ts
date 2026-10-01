'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { brokers as editorialBrokers } from '@/data/brokers'
import { directoryCompanies as editorialDirectory } from '@/data/directory'
import { validateOverridesPayload } from '@/lib/admin-overrides'
import { audit } from '@/lib/audit'
import { Err } from '@/lib/portal/result'
import { run } from '@/lib/portal/result'
import { query, queryOne } from '@/lib/portal/db'
import {
  assertStaffBrandScope,
  hasGlobalStaffScope,
  requireStaff,
  type StaffActor,
} from '@/lib/guards'

/**
 * Admin-only broker profile controls. These actions intentionally bypass the
 * portal draft/publish flow: staff with `brokers:manage` write directly to the
 * public overlay (admin_profile_overrides) and the placement columns on
 * public.brands. Every mutation is audited and revalidates the public cache.
 */

const KNOWN_SLUGS = new Set<string>([
  ...editorialDirectory.map((c) => c.slug.toLowerCase()),
  ...editorialBrokers.map((b) => b.slug.toLowerCase()),
])

function assertKnownSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase()
  if (!/^[a-z0-9-]+$/.test(normalized)) throw new Err('Invalid slug', 'validation')
  if (!KNOWN_SLUGS.has(normalized)) throw new Err('Unknown broker slug', 'not_found')
  return normalized
}

async function assertBrokerScope(actor: StaffActor, slug: string): Promise<void> {
  if (actor.isSuperAdmin) return

  const brand = await queryOne<{ id: string }>(
    `select id from public.brands where slug = $1`,
    [slug],
  )
  if (brand) {
    await assertStaffBrandScope(actor, brand.id)
    return
  }

  if (!(await hasGlobalStaffScope(actor))) throw new Err('Not found', 'not_found')
}

function revalidateBroker(slug: string): void {
  revalidateTag('broker-directory', 'max')
  revalidatePath(`/brokers/${slug}`)
  revalidatePath('/brokers')
  revalidatePath('/')
}

const OverridesInput = z.object({
  slug: z.string().min(1).max(200),
  overrides: z.unknown(),
})

export async function saveAdminProfileOverrides(raw: unknown) {
  return run(async () => {
    const input = OverridesInput.parse(raw)
    const actor = await requireStaff('editorial:write')
    const slug = assertKnownSlug(input.slug)
    await assertBrokerScope(actor, slug)
    let overrides: Record<string, unknown>
    try {
      overrides = validateOverridesPayload(input.overrides)
    } catch (e) {
      throw new Err(e instanceof Error ? e.message : 'Invalid overrides', 'validation')
    }

    await query(
      `insert into public.admin_profile_overrides (slug, overrides, updated_by, updated_at)
       values ($1, $2::jsonb, $3, now())
       on conflict (slug) do update
         set overrides = excluded.overrides,
             updated_by = excluded.updated_by,
             updated_at = now()`,
      [slug, JSON.stringify(overrides), actor.id],
    )
    await audit(actor, null, 'admin.profile.overrides', slug, {
      fields: Object.keys(overrides).length,
    })
    revalidateBroker(slug)
    return { saved: true, fields: Object.keys(overrides).length }
  })
}

export async function clearAdminProfileOverrides(raw: unknown) {
  return run(async () => {
    const input = z.object({ slug: z.string().min(1).max(200) }).parse(raw)
    const actor = await requireStaff('editorial:write')
    const slug = assertKnownSlug(input.slug)
    await assertBrokerScope(actor, slug)
    await query(`delete from public.admin_profile_overrides where slug = $1`, [slug])
    await audit(actor, null, 'admin.profile.overrides', slug, { cleared: true })
    revalidateBroker(slug)
    return { cleared: true }
  })
}

const PlacementInput = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  verification_status: z.enum(['verified', 'unverified']),
  is_sponsored: z.boolean(),
  is_featured: z.boolean(),
  is_duplicate: z.boolean(),
  needs_manual_review: z.boolean(),
  display_rank: z.number().int().min(1).max(999999).nullable(),
  brand_category: z.string().max(100).nullable(),
  brand_status: z.string().max(100).nullable(),
  regulator_tier: z.string().max(100).nullable(),
  internal_priority: z.string().max(100).nullable(),
  internal_notes: z.string().max(5000).nullable(),
})

export type AdminPlacementInput = z.infer<typeof PlacementInput>

export async function saveAdminPlacement(raw: unknown) {
  return run(async () => {
    const input = PlacementInput.parse(raw)
    const actor = await requireStaff('brokers:manage')
    const slug = assertKnownSlug(input.slug)
    await assertBrokerScope(actor, slug)
    const name = input.name.trim().slice(0, 200)
    if (!name) throw new Err('Broker name is required', 'validation')

    await query(
      `insert into public.brands (slug, name, verification_status, is_sponsored, is_featured,
                                  is_duplicate, needs_manual_review, display_rank,
                                  brand_category, brand_status, regulator_tier, internal_priority,
                                  internal_notes, verification_reviewed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
               case when $3 = 'verified' then now() else null end)
       on conflict (slug) do update set
         verification_status = excluded.verification_status,
         is_sponsored = excluded.is_sponsored,
         is_featured = excluded.is_featured,
         is_duplicate = excluded.is_duplicate,
         needs_manual_review = excluded.needs_manual_review,
         display_rank = excluded.display_rank,
         brand_category = excluded.brand_category,
         brand_status = excluded.brand_status,
         regulator_tier = excluded.regulator_tier,
         internal_priority = excluded.internal_priority,
         internal_notes = excluded.internal_notes,
         verification_reviewed_at = excluded.verification_reviewed_at,
         updated_at = now()`,
      [
        slug,
        name,
        input.verification_status,
        input.is_sponsored,
        input.is_featured,
        input.is_duplicate,
        input.needs_manual_review,
        input.display_rank,
        input.brand_category,
        input.brand_status,
        input.regulator_tier,
        input.internal_priority,
        input.internal_notes,
      ],
    )
    await audit(actor, null, 'admin.placement.update', slug, {
      verification_status: input.verification_status,
      is_sponsored: input.is_sponsored,
      is_featured: input.is_featured,
      display_rank: input.display_rank,
    })
    revalidateBroker(slug)
    return { saved: true }
  })
}
