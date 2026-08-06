/**
 * lib/site.ts — single source of truth for the canonical site origin.
 *
 * T08: canonical host is https://www.bestforex.io (www).
 * Every absolute URL in the repo must derive from SITE_URL here.
 * Import from this file in new code; lib/site-config.ts re-exports
 * these values for backward compatibility with existing imports.
 */
export const SITE_URL = 'https://www.bestforex.io'

export const SITE_NAME = 'BestForex.io'

export const SITE_DESCRIPTION =
  'Compare and review 1,800+ forex brokers, CFD platforms and prop trading firms. Independent ratings, regulation checks, spreads, platforms and exclusive offers.'

/** The primary public logo asset (must exist in /public). */
export const SITE_LOGO = `${SITE_URL}/bestforex-logo.png`

/**
 * Default Open Graph share image. Served by the dynamic `app/opengraph-image.tsx`
 * route (Next.js file convention), so it always resolves to a real 200 image.
 */
export const SITE_OG_IMAGE = `${SITE_URL}/opengraph-image`

/**
 * Official social / entity profiles for Organization `sameAs`.
 * ASK T49: Kerem to supply the real verified profile URLs.
 * Placeholder constants — do not invent URLs.
 */
export const SITE_SOCIALS: string[] = [
  // TODO T49: replace with verified official URLs supplied by Kerem
  'https://twitter.com/bestforexio',
  'https://www.linkedin.com/company/bestforexio',
]

/**
 * Guard A: set to true only once the SITE_SOCIALS values above have been
 * confirmed as real, live accounts by Kerem. While false, the footer social
 * link row and the Organization schema sameAs array are suppressed so we do
 * not surface placeholder/unverified profile URLs publicly.
 */
export const SITE_SOCIALS_VERIFIED = false

/**
 * Build an absolute URL on the canonical www host.
 * Accepts a path with or without a leading slash.
 */
export function absoluteUrl(path = ''): string {
  if (!path) return SITE_URL
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
