import 'server-only'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { query, queryOne } from '@/lib/portal/db'
import { Err } from '@/lib/portal/result'
import {
  roleHasFullAccess,
  roleHasPermission,
  type StaffPermission,
  type StaffRole,
} from '@/lib/staff-permissions'
import type { Brand } from '@/types/portal'

/**
 * Server-side authorization (Blueprint Section 11.3, adapted to Better Auth).
 *
 * There is no Row Level Security on Neon, so these guards are the enforcement
 * layer: every server action and protected server component calls exactly one
 * of them before touching data, and every brand-scoped query filters by the
 * brand id returned here. This is defense layer 2/3 (layer 1 is middleware).
 */

const FORCE_PASSWORD_CHANGE = (process.env.FORCE_PASSWORD_CHANGE ?? 'true') !== 'false'
const FULL_ACCESS_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
)

export function isConfiguredFullAccessAdmin(email: string): boolean {
  return FULL_ACCESS_ADMIN_EMAILS.has(email.trim().toLowerCase())
}

export interface SessionUser {
  id: string
  email: string
  name: string | null
}

export interface StaffActor extends SessionUser {
  role: StaffRole
  hasFullAccess: boolean
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
 * Require an active staff role, the requested permission, and a changed
 * password when first-login password changes are enabled.
 */
export async function requireStaff(permission: StaffPermission = 'dashboard:read'): Promise<StaffActor> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Err('Not signed in', 'forbidden')
  const user: SessionUser = {
    id: session.user.id,
    email: (session.user.email ?? '').toLowerCase(),
    name: session.user.name ?? null,
  }

  const [profile, assignment] = await Promise.all([
    queryOne<{ role: string; must_change_password: boolean }>(
      `select role, must_change_password from public.profiles where id = $1`,
      [user.id],
    ),
    queryOne<{
      role: Exclude<StaffRole, 'super_admin' | 'merchant'>
      status: string
      scope_mode: 'all' | 'selected'
      invitation_expired: boolean
    }>(
      `select sa.role, sa.status, sa.scope_mode,
              exists (
                select 1 from public.staff_invitations i
                join public.profiles p on lower(p.email) = lower(i.email)
                 where p.id = sa.user_id
                   and i.status in ('pending', 'expired')
                   and i.expires_at <= now()
              ) as invitation_expired
         from public.staff_access sa where sa.user_id = $1`,
      [user.id],
    ),
  ])

  let role: StaffRole | null = null
  if (profile?.role === 'admin') {
    role = isConfiguredFullAccessAdmin(user.email) ? 'super_admin' : 'admin'
  } else if (assignment?.status === 'active') {
    role = assignment.role
  }

  if (!role) throw new Err('Not found', 'not_found')
  if (role !== 'super_admin' && role !== 'admin' && assignment?.invitation_expired) {
    throw new Err('Staff invitation expired. Ask an administrator to reissue it.', 'forbidden')
  }
  if (FORCE_PASSWORD_CHANGE && profile?.must_change_password) {
    throw new Err('Password change required before staff access.', 'forbidden')
  }
  if (!roleHasPermission(role, permission)) throw new Err('Not found', 'not_found')

  return { ...user, role, hasFullAccess: roleHasFullAccess(role) }
}

/** Apply the actor's global or explicitly assigned broker scope. */
export async function assertStaffBrandScope(actor: StaffActor, brandId: string): Promise<void> {
  if (actor.hasFullAccess) return
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
}

/** Resolve a staff actor and ensure the requested broker is within their scope. */
export async function requireStaffBrand(
  brandId: string,
  permission: StaffPermission,
): Promise<StaffActor> {
  const actor = await requireStaff(permission)
  await assertStaffBrandScope(actor, brandId)
  return actor
}

/** Active admin staff have global access, including broker-unassigned contacts. */
export async function hasGlobalStaffScope(actor: StaffActor): Promise<boolean> {
  return actor.hasFullAccess
}

/** Require an active staff account with full administrative access. */
export async function requireAdmin(): Promise<StaffActor> {
  const actor = await requireStaff('settings:manage')
  if (!actor.hasFullAccess) throw new Err('Not found', 'not_found')
  return actor
}

/** Require an Admin role or a full-access account for Admin user management. */
export async function requireAdminRole(): Promise<StaffActor> {
  const actor = await requireStaff('staff:manage')
  if (actor.role !== 'admin' && !actor.hasFullAccess) {
    throw new Err('Not found', 'not_found')
  }
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
