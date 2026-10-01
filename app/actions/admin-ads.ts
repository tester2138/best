'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import { z } from 'zod'
import { audit } from '@/lib/audit'
import { getVerifiedBlobToken } from '@/lib/blob-storage-safety'
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
 * Admin banner campaign management. Active staff with `brokers:manage` can create,
 * edit, schedule, pause and delete campaigns. Public delivery is client-fetched
 * from /api/ads/[placementKey],
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

function isSafeBannerImageUrl(value: string): boolean {
  if (isSafeSitePath(value)) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

function isSiteBannerId(id: string): boolean {
  return (AD_CAMPAIGN_PLACEMENTS as readonly string[]).includes(id)
}

const SITE_BANNER_SIZES = {
  'horizontal-1': '468x60',
  'horizontal-2': '468x60',
  'square-1': '300x250',
  'square-2': '300x250',
} as const

const MAX_SITE_BANNER_UPLOAD_BYTES = 4 * 1024 * 1024

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

const SiteBannerInput = z.object({
  placementKey: z.enum(AD_CAMPAIGN_PLACEMENTS),
  campaignName: z.string().trim().min(1).max(200),
  brandName: z.string().trim().min(1).max(200),
  imageUrl: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine(isSafeBannerImageUrl, 'Use a site path or a managed Vercel Blob image URL'),
  destinationUrl: UrlLike,
  altText: z.string().trim().min(1).max(300),
})

export type AdCampaignActionInput = z.input<typeof CampaignInput>

export async function saveAdCampaign(raw: unknown) {
  return run(async () => {
    const input = CampaignInput.parse(raw)
    if (input.id && isSiteBannerId(input.id)) {
      throw new Err('Use the Site banners section to manage this fixed placement.', 'validation')
    }
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
    if (isSiteBannerId(input.id)) {
      throw new Err('Use the Site banners section to manage this fixed placement.', 'validation')
    }
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
    if (isSiteBannerId(input.id)) {
      throw new Err('Use the Site banners section to manage this fixed placement.', 'validation')
    }
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

function bannerImageFamily(buffer: Buffer): 'png' | 'jpeg' | 'webp' | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return null
}

export async function saveSiteBanner(raw: unknown) {
  return run(async () => {
    const input = SiteBannerInput.parse(raw)
    const actor = await requireGlobalCampaignManager()
    const size = SITE_BANNER_SIZES[input.placementKey]
    const rows = await query<{ id: string }>(
      `insert into public.ad_campaigns
         (id, placement_key, campaign_name, campaign_type, brand_name, image_url,
          destination_url, alt_text, label, desktop_size, mobile_size, priority,
          status, created_by, updated_by, updated_at)
       values ($1, $1, $2, 'house', $3, $4, $5, $6, '', $7, $7, 999999, 'active', $8, $8, now())
       on conflict (id) do update set
         placement_key = excluded.placement_key,
         campaign_name = excluded.campaign_name,
         brand_name = excluded.brand_name,
         image_url = excluded.image_url,
         destination_url = excluded.destination_url,
         alt_text = excluded.alt_text,
         label = '',
         desktop_size = excluded.desktop_size,
         mobile_size = excluded.mobile_size,
         priority = 999999,
         status = 'active',
         starts_at = null,
         ends_at = null,
         updated_by = excluded.updated_by,
         updated_at = now()
       where public.ad_campaigns.campaign_type = 'house'
       returning id`,
      [
        input.placementKey,
        input.campaignName,
        input.brandName,
        input.imageUrl,
        input.destinationUrl,
        input.altText,
        size,
        actor.id,
      ],
    )
    if (rows.length === 0) {
      throw new Err('This placement is not configured as a fixed site banner.', 'validation')
    }
    await audit(actor, null, 'admin.site_banner.save', input.placementKey, {
      campaignName: input.campaignName,
      imageUrl: input.imageUrl,
    })
    revalidatePath('/admin/site-banners')
    return { placementKey: input.placementKey }
  })
}

export async function uploadSiteBannerImage(formData: FormData) {
  return run(async () => {
    const actor = await requireGlobalCampaignManager()
    const placementKey = z.enum(AD_CAMPAIGN_PLACEMENTS).parse(formData.get('placementKey'))
    const file = formData.get('file')
    if (!(file instanceof File)) throw new Err('Choose an image file to upload.', 'validation')
    if (file.size < 1 || file.size > MAX_SITE_BANNER_UPLOAD_BYTES) {
      throw new Err('Banner images must be 4 MB or smaller.', 'validation')
    }

    const original = Buffer.from(await file.arrayBuffer())
    const family = bannerImageFamily(original)
    if (!family || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      throw new Err('Upload a valid PNG, JPEG, or WebP image.', 'validation')
    }

    const image = sharp(original, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate()
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height) {
      throw new Err('The image dimensions could not be read.', 'validation')
    }
    const expectedRatio = SITE_BANNER_SIZES[placementKey] === '468x60' ? 468 / 60 : 300 / 250
    const actualRatio = metadata.width / metadata.height
    if (Math.abs(actualRatio / expectedRatio - 1) > 0.2) {
      throw new Err(
        `Use artwork close to the ${SITE_BANNER_SIZES[placementKey]} banner proportions.`,
        'validation',
      )
    }

    const optimized = await image
      .resize({ width: 2400, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
    const pathname = `site-banners/${placementKey}/${randomUUID()}.webp`
    const blob = await put(pathname, optimized, {
      token: getVerifiedBlobToken(),
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
    })
    await audit(actor, null, 'admin.site_banner.upload', pathname, {
      placementKey,
      bytes: optimized.length,
      width: metadata.width,
      height: metadata.height,
      format: family,
    })
    return { url: blob.url, pathname }
  })
}

/** Type re-export so the client form can reuse the status list. */
export type { AdCampaignStatus }
