'use server'

import { cookies, headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { queryOne } from '@/lib/portal/db'
import { ACTIVE_BRAND_COOKIE } from '@/lib/portal/active-brand'

/**
 * Switch the active brand in the portal (Blueprint Section 13). Verifies the
 * user actually belongs to the target brand before writing the cookie, so the
 * switcher cannot be used to view a brand the user is not a member of.
 */
export async function switchBrand(brandId: string): Promise<{ ok: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false }
  const member = await queryOne<{ brand_id: string }>(
    `select brand_id from public.brand_members where brand_id = $1 and user_id = $2`,
    [brandId, session.user.id],
  )
  if (!member) return { ok: false }
  const jar = await cookies()
  jar.set(ACTIVE_BRAND_COOKIE, brandId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return { ok: true }
}
