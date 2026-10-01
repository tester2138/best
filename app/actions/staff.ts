'use server'

import { randomBytes, createHash } from 'node:crypto'
import { z } from 'zod'
import { headers } from 'next/headers'
import { run, Err } from '@/lib/portal/result'
import { requireAdmin } from '@/lib/guards'
import { query, queryOne, withTransaction } from '@/lib/portal/db'
import { allowAccountCreation } from '@/lib/portal/creation-context'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/send'

const StaffRoleSchema = z.enum([
  'editor_publisher',
  'commercial_manager',
  'support_reviewer',
  'analyst',
])
const ScopeSchema = z.object({
  role: StaffRoleSchema,
  scopeMode: z.enum(['all', 'selected']),
  brandIds: z.array(z.string().uuid()).max(300),
})

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

async function assertValidScope(scopeMode: 'all' | 'selected', brandIds: string[]) {
  if (scopeMode === 'all') return []
  const ids = [...new Set(brandIds)]
  if (ids.length === 0) throw new Err('Select at least one broker for this staff member.', 'validation')
  const rows = await query<{ id: string }>(`select id from public.brands where id = any($1::uuid[])`, [ids])
  if (rows.length !== ids.length) throw new Err('One or more selected brokers no longer exist.', 'validation')
  return ids
}

export async function inviteStaff(raw: unknown) {
  return run(async () => {
    const actor = await requireAdmin()
    const input = z.object({
      email: z.string().trim().email().max(200),
      fullName: z.string().trim().min(2).max(120),
      ...ScopeSchema.shape,
    }).parse(raw)
    const email = input.email.toLowerCase()
    const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((value) => value.trim().toLowerCase())
    if (email === actor.email || adminEmails.includes(email)) {
      throw new Err('This email cannot be granted delegated staff access.', 'validation')
    }
    const existing = await queryOne<{ id: string }>(
      `select id from public.profiles where lower(email) = $1`,
      [email],
    )
    if (existing) throw new Err('An account already exists for this email. Ask an administrator to review its access.', 'validation')
    const brandIds = await assertValidScope(input.scopeMode, input.brandIds)
    const settings = await queryOne<{ invitation_ttl_days: number }>(
      `select invitation_ttl_days from public.portal_settings where id = true`,
    )
    const expiresDays = settings?.invitation_ttl_days ?? 7

    const password = randomBytes(32).toString('base64url')
    const created = await allowAccountCreation(async () => auth.api.signUpEmail({
      body: { email, password, name: input.fullName },
      headers: await headers(),
    }))
    if (!created.user?.id) throw new Err('Could not create the staff account.')

    await query(`update public.profiles set must_change_password = true where id = $1`, [created.user.id])
    const invitationToken = randomBytes(32).toString('base64url')
    await withTransaction(async (client) => {
      await client.query(
        `insert into public.staff_access (user_id, role, status, scope_mode, created_by, updated_by)
         values ($1, $2, 'active', $3, $4, $4)`,
        [created.user.id, input.role, input.scopeMode, actor.id],
      )
      for (const brandId of brandIds) {
        await client.query(
          `insert into public.staff_brand_scopes (user_id, brand_id, assigned_by) values ($1, $2, $3)`,
          [created.user.id, brandId, actor.id],
        )
      }
      await client.query(
        `insert into public.staff_invitations (email, token_hash, role, scope_mode, scope_brand_ids, invited_by, expires_at)
         values ($1, $2, $3, $4, $5, $6, now() + ($7::integer * interval '1 day'))`,
        [email, hashToken(invitationToken), input.role, input.scopeMode, brandIds, actor.id, expiresDays],
      )
    })
    await audit(actor, null, 'staff.invite', email, {
      role: input.role,
      scopeMode: input.scopeMode,
      brandCount: brandIds.length,
    })
    await sendEmail('staff-invitation', email, {
      fullName: input.fullName,
      email,
      password,
      expiresDays,
      loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/business/login`,
    })
    return { userId: created.user.id }
  })
}

export async function updateStaffAccess(raw: unknown) {
  return run(async () => {
    const actor = await requireAdmin()
    const input = z.object({ userId: z.string().min(1), ...ScopeSchema.shape }).parse(raw)
    if (input.userId === actor.id) throw new Err('You cannot change your own role or scope.', 'validation')
    const target = await queryOne<{ role: string }>(`select role from public.profiles where id = $1`, [input.userId])
    if (!target) throw new Err('Staff account not found.', 'not_found')
    if (target.role === 'admin') throw new Err('Super admin access cannot be changed here.', 'validation')
    const before = await queryOne<{ role: string; scope_mode: string; status: string }>(
      `select role, scope_mode, status from public.staff_access where user_id = $1`,
      [input.userId],
    )
    if (!before || before.status === 'revoked') throw new Err('Active staff access not found.', 'not_found')
    const brandIds = await assertValidScope(input.scopeMode, input.brandIds)

    await withTransaction(async (client) => {
      await client.query(
        `update public.staff_access set role = $2, scope_mode = $3, updated_by = $4, updated_at = now()
          where user_id = $1`,
        [input.userId, input.role, input.scopeMode, actor.id],
      )
      await client.query(`delete from public.staff_brand_scopes where user_id = $1`, [input.userId])
      for (const brandId of brandIds) {
        await client.query(
          `insert into public.staff_brand_scopes (user_id, brand_id, assigned_by) values ($1, $2, $3)`,
          [input.userId, brandId, actor.id],
        )
      }
    })
    await audit(actor, null, 'staff.access.update', input.userId, {
      before: { role: before.role, scopeMode: before.scope_mode },
      after: { role: input.role, scopeMode: input.scopeMode, brandIds },
    })
    return { ok: true }
  })
}

export async function setStaffStatus(raw: unknown) {
  return run(async () => {
    const actor = await requireAdmin()
    const input = z.object({
      userId: z.string().min(1),
      status: z.enum(['active', 'suspended', 'revoked']),
    }).parse(raw)
    if (input.userId === actor.id) throw new Err('You cannot suspend or revoke your own account.', 'validation')
    const target = await queryOne<{ role: string }>(`select role from public.profiles where id = $1`, [input.userId])
    if (!target) throw new Err('Staff account not found.', 'not_found')
    if (target.role === 'admin') throw new Err('Super admin access cannot be changed here.', 'validation')
    const before = await queryOne<{ status: 'active' | 'suspended' | 'revoked' }>(
      `select status from public.staff_access where user_id = $1`,
      [input.userId],
    )
    if (!before) throw new Err('Staff access not found.', 'not_found')
    if (before.status === 'revoked' && input.status === 'active') {
      throw new Err('Revoked staff access cannot be restored. Create a new invitation.', 'validation')
    }
    if (before.status === input.status) return { ok: true }

    await withTransaction(async (client) => {
      const updated = await client.query(
        `update public.staff_access
            set status = $2, suspended_at = case when $2 = 'suspended' then now() else null end,
                updated_by = $3, updated_at = now()
          where user_id = $1`,
        [input.userId, input.status, actor.id],
      )
      if (updated.rowCount !== 1) throw new Err('Staff access not found.', 'not_found')
      if (input.status !== 'active') {
        await client.query(`delete from public.session where "userId" = $1`, [input.userId])
      }
      if (input.status === 'revoked') {
        await client.query(`delete from public.staff_brand_scopes where user_id = $1`, [input.userId])
        await client.query(
          `update public.staff_invitations set status = 'revoked'
            where lower(email) = (select lower(email) from public.profiles where id = $1)
              and status = 'pending'`,
          [input.userId],
        )
      }
    })
    await audit(actor, null, `staff.${input.status}`, input.userId, {
      before: { status: before.status },
      after: { status: input.status },
      sessionsInvalidated: input.status !== 'active',
    })
    return { ok: true }
  })
}

export async function completeStaffMfaEnrollment() {
  return run(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    const userId = session?.user?.id
    const sessionId = session?.session?.id
    if (!userId || !sessionId) throw new Err('Sign in again to complete security setup.', 'forbidden')

    const actor = await queryOne<{
      id: string
      email: string
      role: string
      staff_status: string | null
      two_factor_enabled: boolean
      factor_verified: boolean | null
    }>(
      `select p.id, lower(p.email) as email, p.role, sa.status as staff_status,
              coalesce(u."twoFactorEnabled", false) as two_factor_enabled,
              tf.verified as factor_verified
         from public.profiles p
         join public."user" u on u.id = p.id
         left join public.staff_access sa on sa.user_id = p.id
         left join public."twoFactor" tf on tf."userId" = p.id
        where p.id = $1`,
      [userId],
    )
    if (!actor || (actor.role !== 'admin' && actor.staff_status !== 'active')) {
      throw new Err('Not found', 'not_found')
    }
    if (!actor.two_factor_enabled || actor.factor_verified !== true) {
      throw new Err('Verify your authenticator before completing staff security setup.', 'forbidden')
    }

    const acceptedInvitations = await query<{ id: string }>(
      `update public.staff_invitations set status = 'accepted', accepted_at = now()
        where lower(email) = $1 and status = 'pending' and expires_at > now()
        returning id`,
      [actor.email],
    )
    if (actor.role !== 'admin' && acceptedInvitations.length === 0) {
      const expiredInvitation = await queryOne<{ expired: boolean }>(
        `select exists (
           select 1 from public.staff_invitations
            where lower(email) = $1 and status in ('pending', 'expired') and expires_at <= now()
         ) as expired`,
        [actor.email],
      )
      if (expiredInvitation?.expired) {
        throw new Err('Staff invitation expired. Ask an administrator to reissue it.', 'forbidden')
      }
    }
    await query(
      `delete from public.session where "userId" = $1 and id <> $2`,
      [actor.id, sessionId],
    )
    await audit({ id: actor.id, email: actor.email }, null, 'staff.mfa.enrolled', actor.id, {
      priorSessionsInvalidated: true,
    })
    return { ok: true }
  })
}

export async function reissueStaffInvitation(raw: unknown) {
  return run(async () => {
    const actor = await requireAdmin()
    const input = z.object({ id: z.string().uuid() }).parse(raw)
    const invitation = await queryOne<{
      id: string
      email: string
      user_id: string
      full_name: string | null
      role: StaffMemberRole
      scope_mode: 'all' | 'selected'
      scope_brand_ids: string[]
      access_status: string
      expired: boolean
    }>(
      `select i.id, i.email, p.id as user_id, p.full_name, sa.role, sa.scope_mode,
              coalesce(array_agg(sc.brand_id::text) filter (where sc.brand_id is not null), '{}') as scope_brand_ids,
              sa.status as access_status,
              i.expires_at <= now() as expired
         from public.staff_invitations i
         join public.profiles p on lower(p.email) = lower(i.email)
         join public.staff_access sa on sa.user_id = p.id
         left join public.staff_brand_scopes sc on sc.user_id = p.id
        where i.id = $1 and i.status in ('pending', 'expired')
        group by i.id, p.id, p.full_name, sa.role, sa.scope_mode, sa.status`,
      [input.id],
    )
    if (!invitation || !invitation.expired) {
      throw new Err('Only an expired pending invitation can be reissued.', 'validation')
    }
    if (invitation.access_status !== 'active') {
      throw new Err('Reactivate staff access before reissuing this invitation.', 'validation')
    }

    const settings = await queryOne<{ invitation_ttl_days: number }>(
      `select invitation_ttl_days from public.portal_settings where id = true`,
    )
    const expiresDays = settings?.invitation_ttl_days ?? 7
    const password = randomBytes(32).toString('base64url')
    const token = randomBytes(32).toString('base64url')
    const context = await auth.$context
    const passwordHash = await context.password.hash(password)

    await withTransaction(async (client) => {
      const credential = await client.query(
        `update public.account set password = $2, "updatedAt" = now()
          where "userId" = $1 and "providerId" = 'credential'`,
        [invitation.user_id, passwordHash],
      )
      if (credential.rowCount !== 1) throw new Err('Staff password credential not found.', 'not_found')
      await client.query(
        `update public.profiles set must_change_password = true where id = $1`,
        [invitation.user_id],
      )
      await client.query(`delete from public.session where "userId" = $1`, [invitation.user_id])
      await client.query(
        `update public.staff_access set updated_by = $2, updated_at = now() where user_id = $1`,
        [invitation.user_id, actor.id],
      )
      const updated = await client.query(
        `update public.staff_invitations
            set token_hash = $2, role = $4, scope_mode = $5, scope_brand_ids = $6,
                invited_by = $3, status = 'pending', accepted_at = null,
                expires_at = now() + ($7::integer * interval '1 day')
          where id = $1 and status in ('pending', 'expired')`,
        [input.id, hashToken(token), actor.id, invitation.role, invitation.scope_mode, invitation.scope_brand_ids, expiresDays],
      )
      if (updated.rowCount !== 1) throw new Err('Invitation changed before it could be reissued.', 'not_found')
    })

    await audit(actor, null, 'staff.invite', invitation.email, {
      reissued: true,
      expiresDays,
      role: invitation.role,
      scopeMode: invitation.scope_mode,
    })
    await sendEmail('staff-invitation', invitation.email, {
      fullName: invitation.full_name || invitation.email,
      email: invitation.email,
      password,
      expiresDays,
      loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/business/login`,
    })
    return { ok: true }
  })
}

type StaffMemberRole = 'editor_publisher' | 'commercial_manager' | 'support_reviewer' | 'analyst'
