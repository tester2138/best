'use server'

import { randomBytes, createHash } from 'node:crypto'
import { z } from 'zod'
import { headers } from 'next/headers'
import { run, Err } from '@/lib/portal/result'
import { requireAdmin, requireStaff } from '@/lib/guards'
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
    if (existing) throw new Err('An account already exists for this email. Ask a super admin to update its access.', 'validation')
    const brandIds = await assertValidScope(input.scopeMode, input.brandIds)

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
         values ($1, $2, $3, $4, $5, $6, now() + interval '7 days')`,
        [email, hashToken(invitationToken), input.role, input.scopeMode, brandIds, actor.id],
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
      expiresDays: 7,
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
    const actor = await requireStaff('dashboard:read')
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.id) throw new Err('Sign in again to complete security setup.', 'forbidden')
    await query(
      `update public.staff_invitations set status = 'accepted', accepted_at = now()
        where lower(email) = $1 and status = 'pending' and expires_at > now()`,
      [actor.email],
    )
    await query(
      `delete from public.session where "userId" = $1 and id <> $2`,
      [actor.id, session.session.id],
    )
    await audit(actor, null, 'staff.mfa.enrolled', actor.id, { priorSessionsInvalidated: true })
    return { ok: true }
  })
}
