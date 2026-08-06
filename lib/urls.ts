/**
 * URL validation rules (Blueprint Section 9.3).
 * Brand URLs must live on an official domain; social URLs on the platform's
 * host; regulator register links must NOT point back at the broker.
 */

const SHORTENERS = [
  'bit.ly',
  't.co',
  'tinyurl.com',
  'goo.gl',
  'is.gd',
  'cutt.ly',
  'rebrand.ly',
  'shorturl.at',
]

const SOCIAL_HOSTS: Record<string, string[]> = {
  x: ['x.com', 'twitter.com'],
  facebook: ['facebook.com'],
  instagram: ['instagram.com'],
  linkedin: ['linkedin.com'],
  youtube: ['youtube.com', 'youtu.be'],
  telegram: ['t.me', 'telegram.me'],
}

function hostOf(raw: string): string | null {
  try {
    const u = new URL(raw)
    if (u.username || u.password) return null
    return u.hostname.toLowerCase()
  } catch {
    return null
  }
}

const suffixMatch = (host: string, domain: string) =>
  host === domain || host.endsWith('.' + domain)

export function validateBrandUrl(
  raw: string,
  officialDomains: string[],
): { ok: true } | { ok: false; reason: string } {
  const host = hostOf(raw)
  if (!host) return { ok: false, reason: 'Invalid URL' }
  if (!raw.startsWith('https://')) return { ok: false, reason: 'https required' }
  if (SHORTENERS.some((s) => suffixMatch(host, s)))
    return { ok: false, reason: 'Link shorteners are not allowed' }
  if (!officialDomains.some((d) => suffixMatch(host, d.toLowerCase())))
    return { ok: false, reason: `Host must be one of: ${officialDomains.join(', ')}` }
  return { ok: true }
}

export function validateSocialUrl(
  platform: string,
  raw: string,
): { ok: true } | { ok: false; reason: string } {
  const host = hostOf(raw)
  if (!host || !raw.startsWith('https://')) return { ok: false, reason: 'Invalid URL' }
  const allowed = SOCIAL_HOSTS[platform] ?? []
  return allowed.some((d) => suffixMatch(host, d))
    ? { ok: true }
    : { ok: false, reason: `URL must be on ${allowed.join(' or ')}` }
}

export function validateRegulatorUrl(
  raw: string,
  officialDomains: string[],
): { ok: true } | { ok: false; reason: string } {
  const host = hostOf(raw)
  if (!host || !raw.startsWith('https://')) return { ok: false, reason: 'Invalid URL' }
  if (officialDomains.some((d) => suffixMatch(host, d.toLowerCase())))
    return { ok: false, reason: 'Register link must point to the regulator, not the broker' }
  return { ok: true }
}
