'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { query } from '@/lib/portal/db'
import { run, Err } from '@/lib/portal/result'
import { requireUser } from '@/lib/guards'
import { audit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/send'

/** Update the signed-in user's display name (Blueprint Section 13.5). */
export async function updateProfile(form: FormData) {
  return run(async () => {
    const user = await requireUser()
    const fullName = z.string().trim().min(1).max(120).parse(form.get('fullName'))
    await query(`update public.profiles set full_name = $2 where id = $1`, [user.id, fullName])
    // Keep the Better Auth user name in sync so the header reflects it.
    await query(`update public."user" set name = $2 where id = $1`, [user.id, fullName]).catch(
      () => {},
    )
    return { ok: true }
  })
}

/**
 * Change password from within the portal (Blueprint Section 13.5). The active
 * session is proof of identity, so no current password is required — same
 * policy as the forced set-password flow.
 */
export async function changePassword(form: FormData) {
  return run(async () => {
    const user = await requireUser()
    const pw = z
      .string()
      .min(12)
      .max(72)
      .refine(
        (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v),
        'Use at least 12 characters with upper, lower and a number',
      )
      .parse(form.get('password'))

    const ctx = await auth.$context
    const hashed = await ctx.password.hash(pw)
    await ctx.internalAdapter.updatePassword(user.id, hashed)
    await query(`update public.profiles set must_change_password = false where id = $1`, [
      user.id,
    ])
    await audit({ id: user.id, email: user.email }, null, 'auth.password.set')
    await sendEmail('password-changed', user.email, {})
    return { ok: true }
  })
}

/**
 * Sign out of every device (Blueprint Section 13.5). Revokes all sessions for
 * the current user via the internal adapter, then redirects to login.
 */
export async function signOutEverywhere() {
  const user = await requireUser()
  await query(`delete from public.session where "userId" = $1`, [user.id])
  redirect('/business/login')
}
