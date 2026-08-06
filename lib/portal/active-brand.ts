import 'server-only'
import { cookies } from 'next/headers'
import type { Brand } from '@/types/portal'

export const ACTIVE_BRAND_COOKIE = 'portal_brand'

type Membership = Brand & { memberRole: string }

/**
 * Resolve the active brand for the portal shell (Blueprint Section 13). A user
 * can belong to more than one brand; the switcher writes ACTIVE_BRAND_COOKIE.
 * Falls back to the first membership when the cookie is missing or stale.
 */
export async function resolveActiveBrand(
  brands: Membership[],
): Promise<Membership | null> {
  if (brands.length === 0) return null
  const jar = await cookies()
  const wanted = jar.get(ACTIVE_BRAND_COOKIE)?.value
  return brands.find((b) => b.id === wanted) ?? brands[0]
}
