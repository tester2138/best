const EDITORIAL_MEDIA_ROUTE = '/api/editorial-media'
const PRIVATE_BLOB_HOST_SUFFIX = '.private.blob.vercel-storage.com'
const BLOB_IMAGE_HOST_SUFFIXES = [
  PRIVATE_BLOB_HOST_SUFFIX,
  '.public.blob.vercel-storage.com',
]
const IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif|avif)$/i

export function buildEditorialMediaUrl(pathname: string): string {
  return `${EDITORIAL_MEDIA_ROUTE}?pathname=${encodeURIComponent(pathname)}`
}

export function isSafeEditorialMediaPathname(pathname: string): boolean {
  if (
    !pathname ||
    pathname.length > 1_024 ||
    pathname.startsWith('/') ||
    pathname.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(pathname) ||
    !IMAGE_EXTENSION.test(pathname)
  ) {
    return false
  }

  return pathname.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}

function decodeBlobPathname(pathname: string): string | null {
  try {
    const decoded = decodeURIComponent(pathname.replace(/^\/+/, ''))
    return isSafeEditorialMediaPathname(decoded) ? decoded : null
  } catch {
    return null
  }
}

export function getPrivateEditorialBlobPathname(value: string): string | null {
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      !url.hostname.toLowerCase().endsWith(PRIVATE_BLOB_HOST_SUFFIX)
    ) {
      return null
    }

    return decodeBlobPathname(url.pathname)
  } catch {
    return null
  }
}

export function normalizeEditorialImageUrl(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined
  const pathname = getPrivateEditorialBlobPathname(value)
  return pathname ? buildEditorialMediaUrl(pathname) : value
}

export function normalizeEditorialImageHtml(
  html: string | undefined,
): string | undefined {
  if (typeof html !== 'string') return html

  return html.replace(
    /(\bsrc\s*=\s*)(["'])([^"'\s>]+)\2/gi,
    (match: string, prefix: string, quote: string, source: string) => {
      const normalized = normalizeEditorialImageUrl(source.replaceAll('&amp;', '&'))
      return normalized ? `${prefix}${quote}${normalized}${quote}` : match
    },
  )
}

export function getEditorialMediaPathname(value: string | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value, 'https://bestforex.io')
    if (url.pathname === EDITORIAL_MEDIA_ROUTE) {
      const isRelativeSiteUrl = value.startsWith('/') && !value.startsWith('//')
      const isBestForexHost = url.hostname === 'bestforex.io' || url.hostname === 'www.bestforex.io'
      if (!isRelativeSiteUrl && !isBestForexHost) return null

      const pathname = url.searchParams.get('pathname')
      return pathname && isSafeEditorialMediaPathname(pathname) ? pathname : null
    }

    if (
      url.protocol !== 'https:' ||
      !BLOB_IMAGE_HOST_SUFFIXES.some((suffix) => url.hostname.toLowerCase().endsWith(suffix))
    ) {
      return null
    }

    return decodeBlobPathname(url.pathname)
  } catch {
    return null
  }
}

export function isEditorialMediaUrl(value: string | undefined): boolean {
  if (!value) return false

  try {
    const url = new URL(value, 'https://bestforex.io')
    const isRelativeSiteUrl = value.startsWith('/') && !value.startsWith('//')
    const isBestForexHost = url.hostname === 'bestforex.io' || url.hostname === 'www.bestforex.io'
    return url.pathname === EDITORIAL_MEDIA_ROUTE && (isRelativeSiteUrl || isBestForexHost)
  } catch {
    return false
  }
}

export function isStaticEditorialMediaReferenced(pathname: string): boolean {
  return false
}

export function hasEditorialMediaPathInHtml(html: string | undefined, pathname: string): boolean {
  if (!html) return false

  return [...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].some(
    (match) => getEditorialMediaPathname(match[1]) === pathname,
  )
}

export function isBlobEditorialImageUrl(value: string | undefined): boolean {
  if (!value) return false
  return getEditorialMediaPathname(value) !== null
}

export function getEditorialMediaRoute(): string {
  return EDITORIAL_MEDIA_ROUTE
}

export function isKnownBlobImageHost(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && BLOB_IMAGE_HOST_SUFFIXES.some((suffix) => url.hostname.toLowerCase().endsWith(suffix))
  } catch {
    return false
  }
}

export function getEditorialMediaUrlForImage(value: string): string {
  return normalizeEditorialImageUrl(value) ?? value
}

export function getEditorialMediaPathnameFromBlobUrl(value: string): string | null {
  return isKnownBlobImageHost(value) ? getEditorialMediaPathname(value) : null
}

export function isPrivateEditorialImageUrl(value: string): boolean {
  return getPrivateEditorialBlobPathname(value) !== null
}

export function isEditorialImagePathname(value: string): boolean {
  return isSafeEditorialMediaPathname(value)
}

export function getPublicEditorialMediaPathname(value: string): string | null {
  const pathname = getEditorialMediaPathname(value)
  return pathname && isKnownBlobImageHost(value) ? pathname : null
}

export function normalizeEditorialContentImageReferences(value: string): string {
  return normalizeEditorialImageHtml(value) ?? value
}

export function getEditorialMediaUrl(pathname: string): string {
  return buildEditorialMediaUrl(pathname)
}
