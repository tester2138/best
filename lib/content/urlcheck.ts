import { Err } from '@/lib/portal/result'
import { validateBrandUrl, validateSocialUrl, validateRegulatorUrl } from '@/lib/urls'
import type { Brand } from '@/types/portal'
import type { SectionKey } from './registry'

/**
 * Cross-checks user-entered URLs against the brand's official domains and the
 * per-widget host rules (Blueprint Section 14.5). Throws a coded `validation`
 * Err (with a field path) on the first bad host so the editor can highlight it.
 */
export function validateSectionUrls(
  key: SectionKey,
  v: Record<string, unknown>,
  brand: Pick<Brand, 'official_domains'>,
) {
  const fail = (path: string, reason: string): never => {
    throw new Err(reason, 'validation', { issues: [{ path, message: reason }] })
  }

  if (key === 'company') {
    if (typeof v.website_url === 'string' && v.website_url) {
      const r = validateBrandUrl(v.website_url, brand.official_domains)
      if (!r.ok) fail('website_url', r.reason)
    }
    const social = Array.isArray(v.social_links) ? (v.social_links as Record<string, string>[]) : []
    social.forEach((s, i) => {
      if (s?.url) {
        const r = validateSocialUrl(s.platform, s.url)
        if (!r.ok) fail(`social_links.${i}.url`, r.reason)
      }
    })
  }

  if (key === 'cta' && typeof v.signup_url === 'string' && v.signup_url) {
    const r = validateBrandUrl(v.signup_url, brand.official_domains)
    if (!r.ok) fail('signup_url', r.reason)
  }

  if (key === 'regulation') {
    const licenses = Array.isArray(v.licenses) ? (v.licenses as Record<string, string>[]) : []
    licenses.forEach((l, i) => {
      if (l?.verify_url) {
        const r = validateRegulatorUrl(l.verify_url, brand.official_domains)
        if (!r.ok) fail(`licenses.${i}.verify_url`, r.reason)
      }
    })
  }
}
