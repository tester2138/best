import { randomUUID } from 'node:crypto'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { audit } from '@/lib/audit'
import { getVerifiedBlobToken } from '@/lib/blob-storage-safety'
import { requireStaff } from '@/lib/guards'
import { Err, run } from '@/lib/portal/result'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 64 * 1024
const responseHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
}

type ImageFamily = 'png' | 'jpeg' | 'webp'

function imageFamily(buffer: Buffer): ImageFamily | null {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return null
}

function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')?.split(',')[0].trim().toLowerCase()
  const protocol = (
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ??
    request.nextUrl.protocol.slice(0, -1)
  ).replace(/:$/, '').toLowerCase()
  if (!origin || !host || !protocol) return false

  try {
    const originUrl = new URL(origin)
    return originUrl.host.toLowerCase() === host && originUrl.protocol === `${protocol}:`
  } catch {
    return false
  }
}

function responseStatus(code: string): number {
  switch (code) {
    case 'validation': return 400
    case 'forbidden': return 403
    case 'not_found': return 404
    case 'rate_limited': return 429
    default: return 500
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: 'Upload requests must be same-origin.', code: 'forbidden' },
      { status: 403, headers: responseHeaders },
    )
  }

  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'Images must be 10 MB or smaller.', code: 'validation' },
      { status: 413, headers: responseHeaders },
    )
  }

  const result = await run(async () => {
    const actor = await requireStaff('editorial:write')
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.startsWith('multipart/form-data;')) {
      throw new Err('Choose an image file to upload.', 'validation')
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) throw new Err('Choose an image file to upload.', 'validation')
    if (file.size < 1 || file.size > MAX_IMAGE_BYTES) {
      throw new Err('Images must be 10 MB or smaller.', 'validation')
    }

    const original = Buffer.from(await file.arrayBuffer())
    const family = imageFamily(original)
    if (!family || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      throw new Err('Upload a valid PNG, JPEG, or WebP image.', 'validation')
    }

    const pipeline = sharp(original, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate()
    const metadata = await pipeline.metadata()
    if (!metadata.width || !metadata.height) throw new Err('The image dimensions could not be read.', 'validation')
    const optimized = await pipeline
      .resize({ width: 2_400, height: 2_400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer()

    const pathname = `editorial/${randomUUID()}.webp`
    const blob = await put(pathname, optimized, {
      token: getVerifiedBlobToken(),
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
    })
    await audit(actor, null, 'media.upload', pathname, { bytes: optimized.length, format: family })
    return { url: blob.url, pathname }
  })

  return NextResponse.json(result, {
    status: result.ok ? 200 : responseStatus(result.code ?? 'server'),
    headers: responseHeaders,
  })
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: responseHeaders })
}

export function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: responseHeaders })
}

export function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: responseHeaders })
}

export function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: responseHeaders })
}

export function OPTIONS() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: responseHeaders })
}

export function HEAD() {
  return new NextResponse(null, { status: 405, headers: responseHeaders })
}
