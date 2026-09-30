import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getVerifiedBlobToken, resolveBlobStorageIdentity } from '@/lib/blob-storage-safety'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const blobPath = path.join('/')

    const identity = resolveBlobStorageIdentity()
    const result = await get(blobPath, {
      token: getVerifiedBlobToken(),
      access: identity.environment === 'production' ? 'private' : 'public',
    })

    if (!result || result.statusCode === 304) {
      return new NextResponse('Image not found', { status: 404 })
    }

    const { stream, blob } = result
    const contentType = blob.contentType || 'image/jpeg'

    return new NextResponse(stream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return new NextResponse('Error fetching image', { status: 500 })
  }
}
