'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { isConfiguredFullAccessAdmin, requireAdminRole } from '@/lib/guards'
import { allowAccountCreation } from '@/lib/portal/creation-context'
import { Err, run } from '@/lib/portal/result'
import { query, queryOne, withTransaction } from '@/lib/portal/db'

const AdminAccountInput = z.object({
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(12)
    .max(72)
    .refine(
      (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value),
      'Use at least 12 characters with upper, lower, and numeric characters.',
    ),
})

export async function createAdminAccount(raw: unknown) {
  return run(async () => {
    const actor = await requireAdminRole()
    const parsed = AdminAccountInput.safeParse(raw)
    if (!parsed.success) {
      throw new Err('Check the email and password.', 'validation', {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const email = parsed.data.email.toLowerCase()
    if (isConfiguredFullAccessAdmin(email)) {
      throw new Err('This email is configured for full access and cannot be created as an Admin.', 'forbidden')
    }

    const existing = await queryOne<{ id: string }>(
      `select id from public."user" where lower(email) = $1`,
      [email],
    )
    if (existing) {
      throw new Err('An account already exists for this email address.', 'validation')
    }

    const name = email.slice(0, email.indexOf('@')).slice(0, 120)
    const created = await allowAccountCreation(async () =>
      auth.api.signUpEmail({
        body: { email, password: parsed.data.password, name },
        headers: await headers(),
      }),
    )
    const userId = created.user?.id
    if (!userId) throw new Err('Could not create the Admin account.')

    try {
      const profile = await queryOne<{ id: string }>(
        `insert into public.profiles (id, email, full_name, role, must_change_password)
         values ($1, $2, $3, 'admin', false)
         on conflict (id) do update
           set email = excluded.email,
               full_name = excluded.full_name,
               role = 'admin',
               must_change_password = false,
               updated_at = now()
         returning id`,
        [userId, email, name],
      )
      if (!profile) throw new Err('Could not assign Admin access to this account.')
    } catch (error) {
      try {
        await query(`delete from public."user" where id = $1`, [userId])
      } catch (cleanupError) {
        console.error('[v0] failed to clean up incomplete Admin account:', cleanupError)
      }
      throw error
    }

    await audit(actor, null, 'admin.user.create', email)
    return { userId }
  })
}

export async function removeAdminAccount(raw: unknown) {
  return run(async () => {
    const actor = await requireAdminRole()
    const parsed = z.object({ userId: z.string().min(1).max(128) }).safeParse(raw)
    if (!parsed.success) {
      throw new Err('Admin account not found.', 'validation')
    }

    const email = await withTransaction(async (client) => {
      const result = await client.query<{ id: string; email: string; role: string }>(
        `select id, lower(email) as email, role
           from public.profiles
          where id = $1
          for update`,
        [parsed.data.userId],
      )
      const target = result.rows[0]
      if (!target || target.role !== 'admin') {
        throw new Err('Admin account not found.', 'not_found')
      }
      if (target.id === actor.id) {
        throw new Err('You cannot remove your own Admin access.', 'validation')
      }
      if (isConfiguredFullAccessAdmin(target.email) && !actor.hasFullAccess) {
        throw new Err('Only a full-access user can remove another full-access account.', 'forbidden')
      }

      const demoted = await client.query(
        `update public.profiles
            set role = 'brand_user', must_change_password = false, updated_at = now()
          where id = $1 and role = 'admin'`,
        [target.id],
      )
      if (demoted.rowCount !== 1) throw new Err('Admin account not found.', 'not_found')

      await client.query(
        `update public.staff_access
            set status = 'revoked', suspended_at = null, updated_by = $2, updated_at = now()
          where user_id = $1 and status <> 'revoked'`,
        [target.id, actor.id],
      )
      await client.query(`delete from public.staff_brand_scopes where user_id = $1`, [target.id])
      await client.query(
        `update public.staff_invitations
            set status = 'revoked'
          where lower(email) = $1 and status in ('pending', 'expired')`,
        [target.email],
      )
      await client.query(`delete from public.session where "userId" = $1`, [target.id])
      return target.email
    })

    await audit(actor, null, 'admin.user.remove', email, { sessionsInvalidated: true })
    return { email }
  })
}
