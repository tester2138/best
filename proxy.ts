import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

// Static file extensions — skip normalisation for these paths.
const STATIC_EXT = /\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|css|js|map|txt|xml|json)$/i

function applyDeploymentRobotsHeader(response: NextResponse): NextResponse {
  if (process.env.VERCEL_ENV !== 'production') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  }
  return response
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const { pathname } = url

  // ── Canonical host: apex → www (308) ─────────────────────────────────────
  // Prefer the forwarded host on Vercel, but fall back to Host/nextUrl so this
  // also behaves correctly behind other trusted reverse proxies.
  const requestHost = (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    url.host
  )
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')

  if (requestHost === 'bestforex.io') {
    const destination = url.clone()
    destination.protocol = 'https:'
    destination.hostname = 'www.bestforex.io'
    destination.port = ''
    return applyDeploymentRobotsHeader(NextResponse.redirect(destination, { status: 308 }))
  }

  // ── /portal/* → /business/* permanent redirects (301) ────────────────────
  // The broker portal moved from /portal to /business. Redirect all old URLs
  // so bookmarks, emails, and crawlers land on the correct path.
  if (pathname.startsWith('/portal')) {
    const dest = url.clone()
    dest.pathname = pathname.replace(/^\/portal/, '/business')
    dest.search = url.search
    return applyDeploymentRobotsHeader(NextResponse.redirect(dest, { status: 301 }))
  }

  // ── Business Portal defense layer 1: session-cookie gate ─────────────────
  // Cheap, edge-safe presence check (no DB). Unauthenticated hits to /business
  // or /admin are bounced to /business/login with a next= param. Real role,
  // brand-membership and must_change_password authorization run in the server
  // layouts and server actions (layers 2-3) where the DB is available.
  // Every business/admin response carries noindex (Blueprint Section 11.4).
  if (pathname.startsWith('/business') || pathname.startsWith('/admin')) {
    const res = NextResponse.next()
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    // Forward pathname to the root layout so it can suppress Header/Footer.
    res.headers.set('x-pathname', pathname)

    // Open auth pages. The auth layout validates the full session and redirects
    // authenticated users; a cookie-presence check here would loop for expired
    // or malformed cookies by bouncing between /business and /business/login.
    const OPEN = ['/business/login', '/business/forgot-password', '/business/reset']
    const isOpen = OPEN.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (isOpen) return applyDeploymentRobotsHeader(res)

    const hasSession = getSessionCookie(request)
    if (!hasSession) {
      const loginUrl = url.clone()
      loginUrl.pathname = '/business/login'
      loginUrl.search = ''
      loginUrl.searchParams.set('next', pathname)
      return applyDeploymentRobotsHeader(NextResponse.redirect(loginUrl))
    }
    return applyDeploymentRobotsHeader(res)
  }

  // ── T02 + T12 + Row 174: 410 Gone ────────────────────────────────────────
  if (
    pathname === '/undefined' ||
    pathname.startsWith('/go/') ||
    pathname === '/offer-shortcodes' ||
    pathname === '/post-shortcodes' ||
    pathname.startsWith('/device/') ||
    pathname.startsWith('/broker-language/') ||
    pathname.startsWith('/owner/') ||
    pathname.startsWith('/currency-pair/') ||
    pathname.startsWith('/withdrawal-method/') ||
    pathname.startsWith('/withdrawal-limit/') ||
    pathname.startsWith('/payment-method/') ||
    pathname.startsWith('/category/') ||
    pathname.startsWith('/broker-est/') ||
    pathname.startsWith('/brokers-archive-template-') ||
    pathname.startsWith('/search/') ||
    pathname.endsWith('/feed') ||
    pathname.endsWith('/feed/rss2')
  ) {
    return applyDeploymentRobotsHeader(new NextResponse(null, { status: 410 }))
  }

  // ── T11: URL normalisation ─────────────────────────────────────────────────
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    STATIC_EXT.test(pathname)
  ) {
    return applyDeploymentRobotsHeader(NextResponse.next())
  }

  let normalised = pathname
  let changed = false

  // 1. Strip trailing slash (except root "/").
  if (normalised.length > 1 && normalised.endsWith('/')) {
    normalised = normalised.slice(0, -1)
    changed = true
  }

  // 2. Lowercase any uppercase characters.
  const lowered = normalised.toLowerCase()
  if (lowered !== normalised) {
    normalised = lowered
    changed = true
  }

  // 3. /brokers?page=1 → /brokers (page 1 canonical is the bare path).
  const pageParam = url.searchParams.get('page')
  if (pathname === '/brokers' && pageParam === '1') {
    url.pathname = '/brokers'
    url.searchParams.delete('page')
    return applyDeploymentRobotsHeader(NextResponse.redirect(url, { status: 301 }))
  }

  if (changed) {
    url.pathname = normalised
    return applyDeploymentRobotsHeader(NextResponse.redirect(url, { status: 301 }))
  }

  // Pass pathname to root layout for all non-redirected public routes.
  const res = NextResponse.next()
  res.headers.set('x-pathname', pathname)
  return applyDeploymentRobotsHeader(res)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
