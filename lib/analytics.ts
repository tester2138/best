import 'server-only'
import { createHash } from 'node:crypto'

/**
 * Hash a user-agent string into a short, non-reversible token for coarse
 * click de-duplication in page_events (Blueprint Section 15.5). We intentionally
 * do NOT store IPs or raw UAs on click events — only this salted digest — so the
 * analytics stay privacy-preserving and GDPR-friendly.
 */
export function hashUA(ua: string | null): string {
  const salt = process.env.ANALYTICS_SALT ?? 'bestforex-portal'
  return createHash('sha256')
    .update(`${salt}:${ua ?? 'unknown'}`)
    .digest('hex')
    .slice(0, 16)
}
