'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { audit } from '@/lib/audit'
import { Err, run } from '@/lib/portal/result'
import { query, queryOne } from '@/lib/portal/db'
import { assertStaffBrandScope, hasGlobalStaffScope, requireStaff, type StaffActor } from '@/lib/guards'
import { brokers as editorialBrokers } from '@/data/brokers'
import { directoryCompanies as editorialDirectory } from '@/data/directory'
import {
  ADMIN_OFFER_STATUSES,
  ADMIN_OFFER_TYPES,
} from '@/lib/admin-offer-types'

/**
 * Admin offer (bonus/promotion) management. Staff with `brokers:manage`
 * manage offers within their broker scope on /offers, the homepage strip and broker
 * profiles. Public pages are ISR-cached, so every mutation revalidates
 * the affected paths.
 */

function isSafeSitePath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') && !value.includes('\\')
}

const IsoDate = z
  .string()
  .trim()
  .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Invalid date')
  .transform((v) => (v === '' ? null : new Date(v).toISOString()))
  .nullable()
  .optional()

const OfferInput = z
  .object({
    id: z.string().trim().min(1).max(160).nullable().optional(),
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
      .refine((v) => v === '' || isSafeSitePath(v) || /^https:\/\//i.test(v), {
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
    type: z.enum(ADMIN_OFFER_TYPES),
    terms: z.string().trim().min(1).max(2000),
    affiliateUrl: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .refine((v) => /^https:\/\//i.test(v), 'Affiliate URL must be an https:// URL'),
    isFeatured: z.boolean().default(false),
    isExclusive: z.boolean().default(false),
    startsAt: IsoDate,
    endsAt: IsoDate,
    status: z.enum(ADMIN_OFFER_STATUSES),
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

function revalidateOfferPaths(...brokerIds: Array<string | undefined>): void {
  revalidatePath('/offers')
  revalidatePath('/')
  revalidatePath('/admin/offers')
  revalidateTag('broker-directory', 'max')
  for (const brokerId of new Set(brokerIds.filter((id): id is string => Boolean(id)))) {
    revalidatePath(`/brokers/${brokerId}`)
  }
}

const KNOWN_BROKER_SLUGS = new Set([
  ...editorialDirectory.map((broker) => broker.slug.toLowerCase()),
  ...editorialBrokers.map((broker) => broker.slug.toLowerCase()),
])

async function assertOfferBrokerScope(actor: StaffActor, brokerId: string): Promise<string> {
  const slug = brokerId.trim().toLowerCase()
  if (!/^[a-z0-9-]+$/.test(slug) || !KNOWN_BROKER_SLUGS.has(slug)) {
    throw new Err('Unknown broker slug', 'validation')
  }
  if (actor.hasFullAccess) return slug

  const brand = await queryOne<{ id: string }>(
    `select id from public.brands where slug = $1`,
    [slug],
  )
  if (!brand) {
    if (await hasGlobalStaffScope(actor)) return slug
    throw new Err('Not found', 'not_found')
  }
  await assertStaffBrandScope(actor, brand.id)
  return slug
}

export async function saveAdminOffer(raw: unknown) {
  return run(async () => {
    const input = OfferInput.parse(raw)
    const actor = await requireStaff('brokers:manage')
    const id = input.id ?? randomUUID()
    const brokerId = await assertOfferBrokerScope(actor, input.brokerId)
    const startsAt = input.startsAt ?? null
    const endsAt = input.endsAt ?? null
    const previousRows = input.id
      ? await query<{ broker_id: string }>(
          'select broker_id from public.admin_offers where id = $1',
          [id],
        )
      : []
    if (previousRows[0]) {
      await assertOfferBrokerScope(actor, previousRows[0].broker_id)
    }

    const savedRows = await query<{ id: string }>(
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
         updated_at = now()
       where public.admin_offers.broker_id = $19
       returning id`,
      [
        id,
        brokerId,
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
        previousRows[0]?.broker_id ?? null,
      ],
    )
    if (savedRows.length === 0) throw new Err('Offer changed before it could be saved', 'not_found')
    await audit(actor, null, 'admin.offer.save', id, {
      broker: brokerId,
      title: input.title,
      status: input.status,
    })
    revalidateOfferPaths(brokerId, previousRows[0]?.broker_id)
    return { id }
  })
}

export async function setAdminOfferStatus(raw: unknown) {
  return run(async () => {
    const input = z
      .object({ id: z.string().trim().min(1).max(160), status: z.enum(ADMIN_OFFER_STATUSES) })
      .parse(raw)
    const actor = await requireStaff('brokers:manage')
    const current = await queryOne<{ broker_id: string }>(
      `select broker_id from public.admin_offers where id = $1`,
      [input.id],
    )
    if (!current) throw new Err('Offer not found', 'not_found')
    await assertOfferBrokerScope(actor, current.broker_id)
    const rows = await query<{ broker_id: string }>(
      `update public.admin_offers
          set status = $2, updated_by = $3, updated_at = now()
        where id = $1 and broker_id = $4
        returning broker_id`,
      [input.id, input.status, actor.id, current.broker_id],
    )
    if (rows.length === 0) throw new Err('Offer not found', 'not_found')
    await audit(actor, null, 'admin.offer.status', input.id, { status: input.status })
    revalidateOfferPaths(rows[0].broker_id)
    return { id: input.id }
  })
}

export async function deleteAdminOffer(raw: unknown) {
  return run(async () => {
    const input = z.object({ id: z.string().trim().min(1).max(160) }).parse(raw)
    const actor = await requireStaff('brokers:manage')
    const current = await queryOne<{ broker_id: string }>(
      `select broker_id from public.admin_offers where id = $1`,
      [input.id],
    )
    if (!current) throw new Err('Offer not found', 'not_found')
    await assertOfferBrokerScope(actor, current.broker_id)
    const rows = await query<{ broker_id: string }>(
      `delete from public.admin_offers where id = $1 and broker_id = $2 returning broker_id`,
      [input.id, current.broker_id],
    )
    if (rows.length === 0) throw new Err('Offer not found', 'not_found')
    await audit(actor, null, 'admin.offer.delete', input.id)
    revalidateOfferPaths(rows[0].broker_id)
    return { id: input.id }
  })
}
