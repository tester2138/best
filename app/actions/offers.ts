'use server'

import { z } from 'zod'
import { requireBrandMember } from '@/lib/guards'
import { run, Err } from '@/lib/portal/result'
import { query, queryOne } from '@/lib/portal/db'
import { revalidateBrand } from '@/lib/portal/revalidate'
import { audit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate'
import { scanBanned } from '@/lib/banned'
import { validateBrandUrl } from '@/lib/urls'
import type { Offer } from '@/types/portal'

/** Canonical offer field caps (Blueprint Section 17.1). */
const OfferInput = z.object({
  brandId: z.string().uuid(),
  offerId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(60).refine((v) => !v.includes('\n'), 'No line breaks'),
  subtitle: z.string().trim().max(90).optional().or(z.literal('')),
  description: z
    .string()
    .trim()
    .max(500)
    .refine((v) => (v.match(/\n/g) ?? []).length <= 3, 'Max 3 line breaks')
    .optional()
    .or(z.literal('')),
  terms: z.string().trim().min(1, 'Terms are required').max(1000),
  cta_label: z.string().trim().max(25).optional().or(z.literal('')),
  cta_url: z.string().trim().min(1).max(2048),
  starts_at: z.string().datetime().nullish(),
  ends_at: z.string().datetime().nullish(),
})

const MAX_NON_ARCHIVED = 15

async function getModerationMode(): Promise<'off' | 'hybrid' | 'all'> {
  const s = await queryOne<{ moderation_mode: 'off' | 'hybrid' | 'all' }>(
    `select moderation_mode from public.portal_settings where id = true`,
  )
  return s?.moderation_mode ?? 'hybrid'
}

async function maxActiveOffers(): Promise<number> {
  const s = await queryOne<{ max_active_offers: number }>(
    `select max_active_offers from public.portal_settings where id = true`,
  )
  return s?.max_active_offers ?? 5
}

/** Validate the schedule window: ends after starts, ends within 180 days. */
function checkWindow(starts?: string | null, ends?: string | null) {
  if (starts && ends) {
    const s = new Date(starts).getTime()
    const e = new Date(ends).getTime()
    if (e <= s) throw new Err('End must be after start', 'validation')
    if (e - Date.now() > 180 * 86400000) throw new Err('End is more than 180 days out', 'validation')
  }
}

/** Create or update a draft offer (Blueprint Section 17). */
export async function saveOffer(raw: unknown) {
  return run(async () => {
    const input = OfferInput.parse(raw)
    const member = await requireBrandMember(input.brandId, { write: true })
    const domains = member.brand.official_domains ?? []

    // CTA URL must resolve to an official domain.
    const urlCheck = validateBrandUrl(input.cta_url, domains)
    if (!urlCheck.ok) throw new Err(urlCheck.reason, 'validation')

    // Compliance scan on visible copy.
    const banned = await queryOne<{ banned_terms: string[] }>(
      `select banned_terms from public.portal_settings where id = true`,
    )
    const flags = scanBanned(
      { text: [input.title, input.subtitle, input.description, input.terms].filter(Boolean).join(' ') },
      banned?.banned_terms ?? [],
    )
    if (flags.length) throw new Err(`Remove: ${flags.map((f) => f.detail).join(', ')}`, 'validation')

    checkWindow(input.starts_at, input.ends_at)

    const fields = {
      title: input.title,
      subtitle: input.subtitle || null,
      description: input.description || null,
      terms: input.terms,
      cta_label: input.cta_label || 'Claim offer',
      cta_url: input.cta_url,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
    }

    if (input.offerId) {
      // Editing an active offer sends it back through review (17.2).
      const existing = await queryOne<Offer>(
        `select * from public.offers where id = $1 and brand_id = $2`,
        [input.offerId, input.brandId],
      )
      if (!existing) throw new Err('Offer not found', 'not_found')
      const row = await queryOne<{ id: string }>(
        `update public.offers set
           title=$3, subtitle=$4, description=$5, terms=$6,
           cta_label=$7, cta_url=$8, starts_at=$9, ends_at=$10,
           updated_at=now()
         where id=$1 and brand_id=$2
         returning id`,
        [
          input.offerId,
          input.brandId,
          fields.title,
          fields.subtitle,
          fields.description,
          fields.terms,
          fields.cta_label,
          fields.cta_url,
          fields.starts_at,
          fields.ends_at,
        ],
      )
      await audit(member, input.brandId, 'offer.update', input.offerId)
      return { id: row!.id }
    }

    // New draft — enforce the total non-archived cap.
    const countRow = await queryOne<{ n: string }>(
      `select count(*)::text as n from public.offers
        where brand_id = $1 and status <> 'archived'`,
      [input.brandId],
    )
    if (Number(countRow?.n ?? 0) >= MAX_NON_ARCHIVED)
      throw new Err('Offer limit reached (15). Archive an old offer first.', 'validation')

    const created = await queryOne<{ id: string }>(
      `insert into public.offers
         (brand_id, title, subtitle, description, terms, cta_label, cta_url,
          starts_at, ends_at, status, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10)
       returning id`,
      [
        input.brandId,
        fields.title,
        fields.subtitle,
        fields.description,
        fields.terms,
        fields.cta_label,
        fields.cta_url,
        fields.starts_at,
        fields.ends_at,
        member.id,
      ],
    )
    await audit(member, input.brandId, 'offer.create', created!.id)
    return { id: created!.id }
  })
}

/** Submit a draft/paused offer. Honors moderation mode; enforces active cap. */
export async function submitOffer(raw: unknown) {
  return run(async () => {
    const { brandId, offerId } = z
      .object({ brandId: z.string().uuid(), offerId: z.string().uuid() })
      .parse(raw)
    const member = await requireBrandMember(brandId, { write: true })
    if (!(await rateLimit('publish', brandId)).ok)
      throw new Err('Too many submissions, try later', 'rate_limited')

    const offer = await queryOne<Offer>(
      `select * from public.offers where id = $1 and brand_id = $2`,
      [offerId, brandId],
    )
    if (!offer) throw new Err('Offer not found', 'not_found')
    if (!offer.terms?.trim()) throw new Err('Add terms before submitting', 'validation')

    // Active + pending count must be under the cap.
    const capRow = await queryOne<{ n: string }>(
      `select count(*)::text as n from public.offers
        where brand_id = $1 and status in ('active','pending_review') and id <> $2`,
      [brandId, offerId],
    )
    if (Number(capRow?.n ?? 0) >= (await maxActiveOffers()))
      throw new Err('You have reached your active offer limit', 'cap_reached')

    const mode = await getModerationMode()
    // Offers are always moderated unless mode is 'off' (16.1).
    const goLive = mode === 'off'
    const nextStatus = goLive ? 'active' : 'pending_review'

    await query(`update public.offers set status = $2, updated_at = now() where id = $1`, [
      offerId,
      nextStatus,
    ])

    if (!goLive) {
      await query(
        `insert into public.moderation_queue
           (brand_id, target_type, target_id, payload, auto_flags, status, submitted_by)
         values ($1,'offer',$2,$3,'[]'::jsonb,'pending',$4)`,
        [brandId, offerId, JSON.stringify(offer), member.id],
      )
    } else {
      revalidateBrand(member.brand.slug)
    }
    await audit(member, brandId, 'offer.submit', offerId)
    return { queued: !goLive }
  })
}

/** Pause / resume / archive lifecycle transitions (Blueprint Section 17.2). */
export async function setOfferStatus(raw: unknown) {
  return run(async () => {
    const { brandId, offerId, action } = z
      .object({
        brandId: z.string().uuid(),
        offerId: z.string().uuid(),
        action: z.enum(['pause', 'resume', 'archive']),
      })
      .parse(raw)
    const member = await requireBrandMember(brandId, { write: true })
    const offer = await queryOne<Offer>(
      `select * from public.offers where id = $1 and brand_id = $2`,
      [offerId, brandId],
    )
    if (!offer) throw new Err('Offer not found', 'not_found')

    let next: string
    if (action === 'pause') {
      if (offer.status !== 'active') throw new Err('Only active offers can be paused', 'validation')
      next = 'paused'
    } else if (action === 'resume') {
      if (offer.status !== 'paused') throw new Err('Only paused offers can resume', 'validation')
      next = 'active'
    } else {
      next = 'archived'
    }

    await query(`update public.offers set status = $2, updated_at = now() where id = $1`, [
      offerId,
      next,
    ])
    revalidateBrand(member.brand.slug)
    await audit(
      member,
      brandId,
      action === 'pause' ? 'offer.pause' : action === 'resume' ? 'offer.resume' : 'offer.archive',
      offerId,
    )
    return { status: next }
  })
}

/** List all non-archived offers for the portal offers page. */
export async function listOffers(brandId: string): Promise<Offer[]> {
  await requireBrandMember(brandId)
  return query<Offer>(
    `select * from public.offers
      where brand_id = $1 and status <> 'archived'
      order by sort_order asc, created_at desc`,
    [brandId],
  )
}
