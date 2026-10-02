const EDITORIAL_MEDIA_ROUTE = '/api/editorial-media'
const LEGACY_IMAGE_ROUTE = '/api/images'
const PRIVATE_BLOB_HOST_SUFFIX = '.private.blob.vercel-storage.com'
const BLOB_IMAGE_HOST_SUFFIXES = [
  PRIVATE_BLOB_HOST_SUFFIX,
  '.public.blob.vercel-storage.com',
]
const IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif|avif)$/i

export function buildEditorialMediaUrl(pathname: string): string {
  return `${EDITORIAL_MEDIA_ROUTE}?pathname=${encodeURIComponent(pathname)}`
}

export function buildAdminEditorialMediaUrl(pathname: string): string {
  return `${buildEditorialMediaUrl(pathname)}&preview=1`
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

export function isEditorialMediaUrl(value: string | undefined): boolean {
  if (!value) return false

  try {
    const url = new URL(value, 'https://bestforex.io')
    const isRelativeSiteUrl = value.startsWith('/') && !value.startsWith('//')
    const isBestForexHost = url.hostname === 'bestforex.io' || url.hostname === 'www.bestforex.io'
    const isMediaRoute =
      url.pathname === EDITORIAL_MEDIA_ROUTE ||
      url.pathname.startsWith(`${LEGACY_IMAGE_ROUTE}/`)
    return isMediaRoute && (isRelativeSiteUrl || isBestForexHost)
  } catch {
    return false
  }
}

export function getEditorialMediaPathname(value: string | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value, 'https://bestforex.io')
    const isRelativeSiteUrl = value.startsWith('/') && !value.startsWith('//')
    const isBestForexHost = url.hostname === 'bestforex.io' || url.hostname === 'www.bestforex.io'

    if (url.pathname === EDITORIAL_MEDIA_ROUTE) {
      if (!isRelativeSiteUrl && !isBestForexHost) return null
      const pathname = url.searchParams.get('pathname')
      return pathname && isSafeEditorialMediaPathname(pathname) ? pathname : null
    }

    if (url.pathname.startsWith(`${LEGACY_IMAGE_ROUTE}/`)) {
      if (!isRelativeSiteUrl && !isBestForexHost) return null
      return decodeBlobPathname(url.pathname.slice(LEGACY_IMAGE_ROUTE.length + 1))
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

export function getStreamableEditorialMediaPathname(value: string | undefined): string | null {
  const privatePathname = value ? getPrivateEditorialBlobPathname(value) : null
  if (privatePathname) return privatePathname
  return isEditorialMediaUrl(value) ? getEditorialMediaPathname(value) : null
}

export function normalizeEditorialImageUrl(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined
  const pathname = getPrivateEditorialBlobPathname(value) ??
    (isEditorialMediaUrl(value) ? getEditorialMediaPathname(value) : null)
  return pathname ? buildEditorialMediaUrl(pathname) : value
}
