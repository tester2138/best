'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { audit } from '@/lib/audit'
import { Err, run } from '@/lib/portal/result'
import { query } from '@/lib/portal/db'
import { requireStaff } from '@/lib/guards'

/**
 * Admin offer (bonus/promotion) management. Staff with `brokers:manage`
 * manage the offers shown on /offers, the homepage strip and broker
 * profiles. Public pages are ISR-cached, so every mutation revalidates
 * the affected paths.
 */

const OFFER_STATUSES = ['draft', 'active', 'paused', 'archived'] as const
const OFFER_TYPES = ['deposit', 'no-deposit', 'cashback', 'rebate', 'other'] as const

const IsoDate = z
  .string()
  .trim()
  .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Invalid date')
  .transform((v) => (v === '' ? null : new Date(v).toISOString()))
  .nullable()
  .optional()

const OfferInput = z
  .object({
    id: z.string().uuid().nullable().optional(),
    brokerId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/, 'Broker ID must be lowercase letters, numbers and hyphens'),
    brokerName: z.string().trim().min(1).max(200),
    brokerLogo: z
      .string()
      .trim()
      .max(2048)
      .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), {
        message: 'Logo must be a site path (/...) or an https:// URL',
      })
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(1000),
    value: z.string().trim().min(1).max(100),
    code: z
      .string()
      .trim()
      .max(100)
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
    type: z.enum(OFFER_TYPES),
    terms: z.string().trim().min(1).max(2000),
    affiliateUrl: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .refine((v) => /^https?:\/\//i.test(v), 'Affiliate URL must be an https:// URL'),
    isFeatured: z.boolean().default(false),
    isExclusive: z.boolean().default(false),
    startsAt: IsoDate,
    endsAt: IsoDate,
    status: z.enum(OFFER_STATUSES),
    sortOrder: z.number().int().min(0).max(999999).default(0),
  })
  .superRefine((data, ctx) => {
    if (
      data.startsAt !== null &&
      data.startsAt !== undefined &&
      data.endsAt !== null &&
      data.endsAt !== undefined &&
      data.endsAt <= data.startsAt
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'End date must be after the start date',
      })
    }
  })

export type AdminOfferActionInput = z.input<typeof OfferInput>

function revalidateOfferPaths(brokerId?: string): void {
  revalidatePath('/offers')
  revalidatePath('/')
  revalidatePath('/admin/offers')
  revalidateTag('broker-directory', 'max')
  if (brokerId) revalidatePath(`/brokers/${brokerId}`)
}

export async function saveAdminOffer(raw: unknown) {
  return run(async () => {
    const input = OfferInput.parse(raw)
    const actor = await requireStaff('brokers:manage')
    const id = input.id ?? randomUUID()
    const startsAt = input.startsAt ?? null
    const endsAt = input.endsAt ?? null

    await query(
      `insert into public.admin_offers
         (id, broker_id, broker_name, broker_logo, title, description, value, code,
          type, terms, affiliate_url, is_featured, is_exclusive, starts_at, ends_at,
          status, sort_order, updated_by, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, now())
       on conflict (id) do update set
         broker_id = excluded.broker_id,
         broker_name = excluded.broker_name,
         broker_logo = excluded.broker_logo,
         title = excluded.title,
         description = excluded.description,
         value = excluded.value,
         code = excluded.code,
         type = excluded.type,
         terms = excluded.terms,
         affiliate_url = excluded.affiliate_url,
         is_featured = excluded.is_featured,
         is_exclusive = excluded.is_exclusive,
         starts_at = excluded.starts_at,
         ends_at = excluded.ends_at,
         status = excluded.status,
         sort_order = excluded.sort_order,
         updated_by = excluded.updated_by,
         updated_at = now()`,
      [
        id,
        input.brokerId,
        input.brokerName,
        input.brokerLogo ?? null,
        input.title,
        input.description,
        input.value,
        input.code ?? null,
        input.type,
        input.terms,
        input.affiliateUrl,
        input.isFeatured,
        input.isExclusive,
        startsAt,
        endsAt,
        input.status,
        input.sortOrder,
        actor.id,
      ],
    )
    await audit(actor, null, 'admin.offer.save', id, {
      broker: input.brokerId,
      title: input.title,
      status: input.status,
    })
    revalidateOfferPaths(input.brokerId)
    return { id }
  })
}

export async function setAdminOfferStatus(raw: unknown) {
  return run(async () => {
    const input = z
      .object({ id: z.string().uuid(), status: z.enum(OFFER_STATUSES) })
      .parse(raw)
    const actor = await requireStaff('brokers:manage')
    const rows = await query<{ broker_id: string }>(
      `update public.admin_offers
          set status = $2, updated_by = $3, updated_at = now()
        where id = $1
        returning broker_id`,
      [input.id, input.status, actor.id],
    )
    if (rows.length === 0) throw new Err('Offer not found', 'not_found')
    await audit(actor, null, 'admin.offer.status', input.id, { status: input.status })
    revalidateOfferPaths(rows[0].broker_id)
    return { id: input.id }
  })
}

export async function deleteAdminOffer(raw: unknown) {
  return run(async () => {
    const input = z.object({ id: z.string().uuid() }).parse(raw)
    const actor = await requireStaff('brokers:manage')
    const rows = await query<{ broker_id: string }>(
      `delete from public.admin_offers where id = $1 returning broker_id`,
      [input.id],
    )
    if (rows.length === 0) throw new Err('Offer not found', 'not_found')
    await audit(actor, null, 'admin.offer.delete', input.id)
    revalidateOfferPaths(rows[0].broker_id)
    return { id: input.id }
  })
}
