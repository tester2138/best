'use server'

import { z } from 'zod'
import sharp from 'sharp'
import { put, del } from '@vercel/blob'
import { getVerifiedBlobToken } from '@/lib/blob-storage-safety'
import { requireBrandMember } from '@/lib/guards'
import { run, Err } from '@/lib/portal/result'
import { query, queryOne } from '@/lib/portal/db'
import { revalidateBrand } from '@/lib/portal/revalidate'
import { audit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate'
import type { MediaAsset } from '@/types/portal'

/**
 * Media pipeline (Blueprint Section 18) adapted to Vercel Blob + sharp.
 * All processing happens inline in this Node-runtime server action:
 * sniff magic bytes -> sharp rotate/re-encode WebP q82 -> enforce dimensions
 * -> upload to Blob -> insert media_assets row -> audit.
 */

const KIND_RULES = {
  logo: { maxBytes: 1_048_576, minPx: 256, maxPx: 1024 },
  screenshot: { maxBytes: 2_097_152, minLong: 800, minShort: 450, maxPx: 4000 },
} as const

const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp']

/** Magic-byte sniff: reject SVG and anything not in the raster allowlist. */
function sniffFamily(buf: Buffer): 'png' | 'jpeg' | 'webp' | null {
  if (buf.length < 12) return null
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'webp'
  return null
}

const UploadInput = z.object({
  brandId: z.string().uuid(),
  kind: z.enum(['logo', 'screenshot']),
  alt: z.string().trim().max(140).optional(),
})

/**
 * Accepts a FormData with fields: brandId, kind, alt, file (the raw image).
 * Returns the created MediaAsset id.
 */
export async function uploadMedia(formData: FormData) {
  return run(async () => {
    const input = UploadInput.parse({
      brandId: formData.get('brandId'),
      kind: formData.get('kind'),
      alt: formData.get('alt') ?? undefined,
    })
    const member = await requireBrandMember(input.brandId, { write: true })

    if (!(await rateLimit('upload', input.brandId)).ok)
      throw new Err('Upload limit reached, try again later', 'rate_limited')

    if (input.kind === 'screenshot' && !input.alt)
      throw new Err('Alt text is required for screenshots', 'validation')

    const file = formData.get('file')
    if (!(file instanceof File)) throw new Err('No file provided', 'validation')

    const rules = KIND_RULES[input.kind]
    if (file.size > rules.maxBytes)
      throw new Err(`File exceeds ${Math.round(rules.maxBytes / 1024 / 1024)}MB limit`, 'validation')
    if (!ACCEPTED_MIME.includes(file.type))
      throw new Err('Only PNG, JPG or WebP allowed', 'validation')

    // Screenshot count cap (approved + pending, max 8).
    if (input.kind === 'screenshot') {
      const c = await queryOne<{ n: string }>(
        `select count(*)::text as n from public.media_assets
          where brand_id = $1 and kind = 'screenshot' and status in ('approved','pending_review')`,
        [input.brandId],
      )
      if (Number(c?.n ?? 0) >= 8) throw new Err('Maximum 8 screenshots', 'validation')
    }

    const original = Buffer.from(await file.arrayBuffer())
    const family = sniffFamily(original)
    if (!family) throw new Err('Unrecognized or unsafe image (SVG is not allowed)', 'validation')

    // Re-encode: auto-rotate, strip metadata, WebP quality 82.
    const pipeline = sharp(original, { failOn: 'error' }).rotate()
    const meta = await pipeline.metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0

    // Enforce dimension rules per kind.
    if (input.kind === 'logo') {
      const r = KIND_RULES.logo
      const ratio = width && height ? width / height : 0
      if (Math.abs(ratio - 1) > 0.02)
        throw new Err('Logo must be square (within 2% tolerance)', 'validation')
      if (width < r.minPx || width > r.maxPx || height < r.minPx || height > r.maxPx)
        throw new Err('Logo must be 256–1024px per side', 'validation')
    } else {
      const r = KIND_RULES.screenshot
      const long = Math.max(width, height)
      const short = Math.min(width, height)
      if (long < r.minLong || short < r.minShort)
        throw new Err('Screenshot must be at least 800×450', 'validation')
      if (long > r.maxPx) throw new Err('Screenshot long edge exceeds 4000px', 'validation')
    }

    const webp = await pipeline.webp({ quality: 82 }).toBuffer()

    const path = `brands/${input.brandId}/${crypto.randomUUID()}.webp`
    const blobToken = getVerifiedBlobToken()
    const blob = await put(path, webp, {
      token: blobToken,
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
    })

    // A new logo replaces the old one: retire prior logos to rejected.
    if (input.kind === 'logo') {
      await query(
        `update public.media_assets set status = 'rejected'
          where brand_id = $1 and kind = 'logo' and status <> 'rejected'`,
        [input.brandId],
      )
    }

    const row = await queryOne<{ id: string }>(
      `insert into public.media_assets
         (brand_id, kind, storage_path, public_url, width, height, bytes,
          alt_text, status, uploaded_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'approved',$9)
       returning id`,
      [
        input.brandId,
        input.kind,
        path,
        blob.url,
        width,
        height,
        webp.length,
        input.alt ?? null,
        member.id,
      ],
    )
    await audit(member, input.brandId, 'media.upload', row!.id, { kind: input.kind })
    revalidateBrand(member.brand.slug)
    return { id: row!.id, url: blob.url, width, height }
  })
}

/** Delete an asset: remove from Blob + DB, revalidate if it was live. */
export async function deleteMedia(raw: unknown) {
  return run(async () => {
    const { brandId, assetId } = z
      .object({ brandId: z.string().uuid(), assetId: z.string().uuid() })
      .parse(raw)
    const member = await requireBrandMember(brandId, { write: true })

    const asset = await queryOne<MediaAsset>(
      `select * from public.media_assets where id = $1 and brand_id = $2`,
      [assetId, brandId],
    )
    if (!asset) throw new Err('Asset not found', 'not_found')

    const blobToken = getVerifiedBlobToken()
    try {
      await del(asset.public_url, { token: blobToken })
    } catch {
      /* object may already be gone; proceed to remove the row */
    }
    await query(`delete from public.media_assets where id = $1`, [assetId])

    await audit(member, brandId, 'media.delete', assetId)
    if (asset.status === 'approved') revalidateBrand(member.brand.slug)
    return { deleted: true }
  })
}

/** Update alt text on an existing asset. */
export async function updateMediaAlt(raw: unknown) {
  return run(async () => {
    const { brandId, assetId, alt } = z
      .object({
        brandId: z.string().uuid(),
        assetId: z.string().uuid(),
        alt: z.string().trim().max(140),
      })
      .parse(raw)
    const member = await requireBrandMember(brandId, { write: true })
    await query(
      `update public.media_assets set alt_text = $3 where id = $1 and brand_id = $2`,
      [assetId, brandId, alt],
    )
    if (member.brand.slug) revalidateBrand(member.brand.slug)
    return { ok: true }
  })
}

/** List all non-rejected media for the portal media page. */
export async function listMedia(brandId: string): Promise<MediaAsset[]> {
  await requireBrandMember(brandId)
  return query<MediaAsset>(
    `select * from public.media_assets
      where brand_id = $1 and status <> 'rejected'
      order by kind asc, sort_order asc, created_at desc`,
    [brandId],
  )
}
