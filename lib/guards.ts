import 'server-only'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { query, queryOne } from '@/lib/portal/db'
import { Err } from '@/lib/portal/result'
import type { Brand } from '@/types/portal'

/**
 * Server-side authorization (Blueprint Section 11.3, adapted to Better Auth).
 *
 * There is no Row Level Security on Neon, so these guards are the enforcement
 * layer: every server action and protected server component calls exactly one
 * of them before touching data, and every brand-scoped query filters by the
 * brand id returned here. This is defense layer 2/3 (layer 1 is middleware).
 */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export interface SessionUser {
  id: string
  email: string
  name: string | null
}

/** Any authenticated user. Throws `forbidden` when there is no session. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Err('Not signed in', 'forbidden')
  return {
    id: session.user.id,
    email: (session.user.email ?? '').toLowerCase(),
    name: session.user.name ?? null,
  }
}

/**
 * Admin only. Env-listed admins self-promote on first authenticated hit
 * (bootstrap), mirroring the blueprint. Non-admins get an opaque `not_found`.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const user = await requireUser()
  const prof = await queryOne<{ role: string }>(
    `select role from public.profiles where id = $1`,
    [user.id],
  )
  if (prof?.role !== 'admin') {
    if (!ADMIN_EMAILS.includes(user.email)) throw new Err('Not found', 'not_found')
    // Bootstrap: promote the env-listed admin (and ensure a profile row).
    await query(
      `insert into public.profiles (id, email, full_name, role, must_change_password)
       values ($1, $2, $3, 'admin', false)
       on conflict (id) do update set role = 'admin'`,
      [user.id, user.email, user.name],
    )
  }
  return { id: user.id, email: user.email }
}

/**
 * Brand membership guard. `write: true` also enforces the lock/pause gates so
 * paused or locked brands cannot mutate content.
 */
export async function requireBrandMember(
  brandId: string,
  opts: { write?: boolean } = {},
): Promise<{ id: string; email: string; brand: Brand; memberRole: string }> {
  const user = await requireUser()
  const [member, brand] = await Promise.all([
    queryOne<{ role: string }>(
      `select role from public.brand_members where brand_id = $1 and user_id = $2`,
      [brandId, user.id],
    ),
    queryOne<Brand>(`select * from public.brands where id = $1`, [brandId]),
  ])
  if (!member || !brand) throw new Err('Not found', 'not_found')
  if (opts.write) {
    if (brand.portal_locked) throw new Err('Portal is locked by the site admin', 'locked')
    if (brand.portal_access === 'paused')
      throw new Err('Access is paused. Contact BestForex.io to resume.', 'paused')
  }
  return { id: user.id, email: user.email, brand, memberRole: member.role }
}

/**
 * Full session context for portal layout/dashboard: the profile row plus all
 * brand memberships (for the brand switcher). Redirect handling lives in the
 * portal layout, not here.
 */
export async function getSessionContext(): Promise<{
  user: SessionUser
  profile: { role: string; mustChangePassword: boolean; fullName: string | null }
  brands: Array<Brand & { memberRole: string }>
} | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const user: SessionUser = {
    id: session.user.id,
    email: (session.user.email ?? '').toLowerCase(),
    name: session.user.name ?? null,
  }
  const profile = await queryOne<{
    role: string
    must_change_password: boolean
    full_name: string | null
  }>(`select role, must_change_password, full_name from public.profiles where id = $1`, [
    user.id,
  ])
  const brands = await query<Brand & { memberRole: string }>(
    `select b.*, m.role as "memberRole"
       from public.brand_members m
       join public.brands b on b.id = m.brand_id
      where m.user_id = $1
      order by b.name asc`,
    [user.id],
  )
  return {
    user,
    profile: {
      role: profile?.role ?? 'brand_user',
      mustChangePassword: profile?.must_change_password ?? false,
      fullName: profile?.full_name ?? null,
    },
    brands,
  }
}
