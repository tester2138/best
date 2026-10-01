'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { audit } from '@/lib/audit'
import { Err, run } from '@/lib/portal/result'
import { query } from '@/lib/portal/db'
import { hasGlobalStaffScope, requireStaff } from '@/lib/guards'
import {
  AD_CAMPAIGN_PLACEMENTS,
  AD_CAMPAIGN_SIZES,
  AD_CAMPAIGN_STATUSES,
  AD_CAMPAIGN_TYPES,
  type AdCampaignStatus,
} from '@/lib/ad-campaign-types'

/**
 * Admin banner campaign management. Globally scoped staff with `brokers:manage`
 * (commercial managers and super admins) create, edit, schedule, pause and delete
 * campaigns. Public delivery is client-fetched from /api/ads/[placementKey],
 * so no public cache revalidation is needed here.
 */

async function requireGlobalCampaignManager() {
  const actor = await requireStaff('brokers:manage')
  if (!(await hasGlobalStaffScope(actor))) throw new Err('Not found', 'not_found')
  return actor
}

function isSafeSitePath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') && !value.includes('\\')
}

const UrlLike = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (value) => isSafeSitePath(value) || /^https:\/\//i.test(value),
    'Must be a site path (/...) or an https:// URL',
  )

const IsoDate = z
  .string()
  .trim()
  .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Invalid date')
  .transform((v) => (v === '' ? null : new Date(v).toISOString()))
  .nullable()
  .optional()

const CampaignInput = z
  .object({
    id: z.string().trim().min(1).max(160).nullable().optional(),
    placementKey: z.enum(AD_CAMPAIGN_PLACEMENTS),
    campaignName: z.string().trim().min(1).max(200),
    campaignType: z.enum(AD_CAMPAIGN_TYPES),
    brandName: z.string().trim().min(1).max(200),
    imageUrl: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .refine((value) => isSafeSitePath(value) || /^https:\/\//i.test(value), {
        message: 'Image must be a site path (/...) or an https:// URL',
      }),
    destinationUrl: UrlLike,
    altText: z.string().trim().min(1).max(300),
    label: z.enum(['', 'Ad']).default('Ad'),
    desktopSize: z.enum(AD_CAMPAIGN_SIZES),
    mobileSize: z.enum(AD_CAMPAIGN_SIZES).nullable(),
    priority: z.number().int().min(1).max(999999),
    status: z.enum(AD_CAMPAIGN_STATUSES),
    startsAt: IsoDate,
    endsAt: IsoDate,
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
    if (data.campaignType === 'paid' && data.label !== 'Ad') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['label'],
        message: 'Paid campaigns must carry the "Ad" disclosure label',
      })
    }
  })

export type AdCampaignActionInput = z.input<typeof CampaignInput>

export async function saveAdCampaign(raw: unknown) {
  return run(async () => {
    const input = CampaignInput.parse(raw)
    const actor = await requireGlobalCampaignManager()
    const id = input.id ?? randomUUID()
    const startsAt = input.startsAt ?? null
    const endsAt = input.endsAt ?? null

    await query(
      `insert into public.ad_campaigns
         (id, placement_key, campaign_name, campaign_type, brand_name, image_url,
          destination_url, alt_text, label, desktop_size, mobile_size, priority,
          status, starts_at, ends_at, updated_by, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
       on conflict (id) do update set
         placement_key = excluded.placement_key,
         campaign_name = excluded.campaign_name,
         campaign_type = excluded.campaign_type,
         brand_name = excluded.brand_name,
         image_url = excluded.image_url,
         destination_url = excluded.destination_url,
         alt_text = excluded.alt_text,
         label = excluded.label,
         desktop_size = excluded.desktop_size,
         mobile_size = excluded.mobile_size,
         priority = excluded.priority,
         status = excluded.status,
         starts_at = excluded.starts_at,
         ends_at = excluded.ends_at,
         updated_by = excluded.updated_by,
         updated_at = now()`,
      [
        id,
        input.placementKey,
        input.campaignName,
        input.campaignType,
        input.brandName,
        input.imageUrl,
        input.destinationUrl,
        input.altText,
        input.label,
        input.desktopSize,
        input.mobileSize,
        input.priority,
        input.status,
        startsAt,
        endsAt,
        actor.id,
      ],
    )
    await audit(actor, null, 'admin.campaign.save', id, {
      placement: input.placementKey,
      name: input.campaignName,
      status: input.status,
    })
    revalidatePath('/admin/advertising')
    return { id }
  })
}

export async function setAdCampaignStatus(raw: unknown) {
  return run(async () => {
    const input = z
      .object({ id: z.string().trim().min(1).max(160), status: z.enum(AD_CAMPAIGN_STATUSES) })
      .parse(raw)
    const actor = await requireGlobalCampaignManager()
    const result = await query(
      `update public.ad_campaigns
          set status = $2, updated_by = $3, updated_at = now()
        where id = $1
        returning id`,
      [input.id, input.status, actor.id],
    )
    if (result.length === 0) throw new Err('Campaign not found', 'not_found')
    await audit(actor, null, 'admin.campaign.status', input.id, {
      status: input.status,
    })
    revalidatePath('/admin/advertising')
    return { id: input.id }
  })
}

export async function deleteAdCampaign(raw: unknown) {
  return run(async () => {
    const input = z.object({ id: z.string().trim().min(1).max(160) }).parse(raw)
    const actor = await requireGlobalCampaignManager()
    const result = await query(
      `delete from public.ad_campaigns where id = $1 returning id`,
      [input.id],
    )
    if (result.length === 0) throw new Err('Campaign not found', 'not_found')
    await audit(actor, null, 'admin.campaign.delete', input.id)
    revalidatePath('/admin/advertising')
    return { id: input.id }
  })
}

/** Type re-export so the client form can reuse the status list. */
export type { AdCampaignStatus }
