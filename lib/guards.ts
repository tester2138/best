import 'server-only'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { query, queryOne } from '@/lib/portal/db'
import { Err } from '@/lib/portal/result'
import { isMfaSessionFresh, roleHasPermission, type StaffPermission, type StaffRole } from '@/lib/staff-permissions'
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

export interface StaffActor extends SessionUser {
  role: StaffRole
  isSuperAdmin: boolean
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
 * Require an active staff role, the permission, and a session minted after the
 * verified TOTP factor. Better Auth withholds a session during the sign-in
 * challenge; the timestamp check also invalidates sessions created before MFA
 * was enabled or replaced.
 */
export async function requireStaff(permission: StaffPermission = 'dashboard:read'): Promise<StaffActor> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Err('Not signed in', 'forbidden')
  const user: SessionUser = {
    id: session.user.id,
    email: (session.user.email ?? '').toLowerCase(),
    name: session.user.name ?? null,
  }

  const [profile, assignment, mfaState] = await Promise.all([
    queryOne<{ role: string }>(`select role from public.profiles where id = $1`, [user.id]),
    queryOne<{ role: Exclude<StaffRole, 'super_admin' | 'merchant'>; status: string; scope_mode: 'all' | 'selected' }>(
      `select role, status, scope_mode from public.staff_access where user_id = $1`,
      [user.id],
    ),
    queryOne<{
      enabled: boolean
      factor_created_at: string | null
      session_created_at: string | null
    }>(
      `select u."twoFactorEnabled" as enabled,
              (select tf."createdAt"::text from public."twoFactor" tf
                where tf."userId" = u.id and tf.verified = true limit 1) as factor_created_at,
              (select s.created_at::text from public.session s
                where s.id = $2 and s."userId" = u.id limit 1) as session_created_at
         from public."user" u where u.id = $1`,
      [user.id, session.session.id],
    ),
  ])

  let role: StaffRole | null = null
  if (profile?.role === 'admin') role = 'super_admin'
  else if (assignment?.status === 'active') role = assignment.role

  if (!role) throw new Err('Not found', 'not_found')
  if (!mfaState?.enabled) {
    throw new Err('Multi-factor authentication is required for staff access', 'forbidden')
  }
  if (!isMfaSessionFresh(mfaState.enabled, mfaState.factor_created_at, mfaState.session_created_at)) {
    throw new Err('Sign in again and complete multi-factor authentication', 'forbidden')
  }
  if (!roleHasPermission(role, permission)) throw new Err('Not found', 'not_found')

  return { ...user, role, isSuperAdmin: role === 'super_admin' }
}

/** Resolve a staff actor and ensure the requested broker is within their scope. */
export async function requireStaffBrand(
  brandId: string,
  permission: StaffPermission,
): Promise<StaffActor> {
  const actor = await requireStaff(permission)
  if (actor.isSuperAdmin) return actor
  const assignment = await queryOne<{ scope_mode: 'all' | 'selected' }>(
    `select scope_mode from public.staff_access where user_id = $1 and status = 'active'`,
    [actor.id],
  )
  if (assignment?.scope_mode !== 'all') {
    const scope = await queryOne<{ brand_id: string }>(
      `select brand_id from public.staff_brand_scopes where user_id = $1 and brand_id = $2`,
      [actor.id, brandId],
    )
    if (!scope) throw new Err('Not found', 'not_found')
  }
  return actor
}

/** Whether a staff actor is explicitly allowed to read broker-unassigned contact submissions. */
export async function hasGlobalStaffScope(actor: StaffActor): Promise<boolean> {
  if (actor.isSuperAdmin) return true
  const assignment = await queryOne<{ scope_mode: 'all' | 'selected' }>(
    `select scope_mode from public.staff_access where user_id = $1 and status = 'active'`,
    [actor.id],
  )
  return assignment?.scope_mode === 'all'
}

/** Legacy name retained for callers that explicitly require unrestricted super-admin access. */
export async function requireAdmin(): Promise<StaffActor> {
  const actor = await requireStaff('settings:manage')
  if (!actor.isSuperAdmin) throw new Err('Not found', 'not_found')
  return actor
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
