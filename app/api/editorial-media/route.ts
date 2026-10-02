import { get } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { isSafeEditorialMediaPathname } from '@/lib/editorial-media'
import { requireStaff } from '@/lib/guards'
import { Err } from '@/lib/portal/result'
import { getVerifiedBlobToken, resolveBlobStorageIdentity } from '@/lib/blob-storage-safety'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const IMAGE_CONTENT_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const PRIVATE_IMAGE_HEADERS = {
  'Cache-Control': 'private, no-cache',
  'Vary': 'Cookie',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404, headers: PRIVATE_IMAGE_HEADERS })
}

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get('pathname')
  if (
    request.nextUrl.searchParams.get('preview') !== '1' ||
    !pathname ||
    !isSafeEditorialMediaPathname(pathname)
  ) {
    return notFound()
  }

  try {
    await requireStaff('editorial:read')
  } catch (error) {
    if (error instanceof Err && (error.code === 'forbidden' || error.code === 'not_found')) {
      return notFound()
    }
    console.error('[editorial-media] Preview authorization failed:', error)
    return new NextResponse(null, { status: 500, headers: PRIVATE_IMAGE_HEADERS })
  }

  try {
    const identity = resolveBlobStorageIdentity()
    const result = await get(pathname, {
      token: getVerifiedBlobToken(),
      access: identity.environment === 'production' ? 'private' : 'public',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) return notFound()

    const headers = {
      ...PRIVATE_IMAGE_HEADERS,
      ETag: result.blob.etag,
    }
    if (result.statusCode === 304) {
      return new NextResponse(null, { status: 304, headers })
    }

    const contentType = result.blob.contentType?.split(';', 1)[0]?.trim().toLowerCase()
    if (!contentType || !IMAGE_CONTENT_TYPES.has(contentType)) {
      await result.stream.cancel().catch(() => undefined)
      return notFound()
    }

    return new NextResponse(result.stream, {
      headers: { ...headers, 'Content-Type': contentType },
    })
  } catch (error) {
    console.error('[editorial-media] Preview stream failed:', error)
    return new NextResponse(null, { status: 500, headers: PRIVATE_IMAGE_HEADERS })
  }
}

