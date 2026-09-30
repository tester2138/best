'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { APIError } from 'better-auth/api'
import { auth } from '@/lib/auth'
import { query, queryOne } from '@/lib/portal/db'
import { run, Err } from '@/lib/portal/result'
import { rateLimit } from '@/lib/rate'
import { verifyTurnstile } from '@/lib/turnstile'
import { audit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/send'

/**
 * Auth server actions (Blueprint Section 11.6, adapted to Better Auth).
 *
 * Sign-in and sign-out run through `auth.api.*`; the nextCookies plugin writes
 * the session cookie. The forced first-login password change uses Better Auth's
 * internal adapter (the same path its own changePassword route uses) so we can
 * update the password from a valid session without re-entering the temp one.
 */

const FORCE_PASSWORD_CHANGE = (process.env.FORCE_PASSWORD_CHANGE ?? 'true') !== 'false'

// Where a signed-in user belongs, based on role, password state, and MFA state.
async function destinationFor(userId: string): Promise<string> {
  const prof = await queryOne<{
    role: string
    must_change_password: boolean
    two_factor_enabled: boolean
  }>(
    `select p.role, p.must_change_password, u."twoFactorEnabled" as two_factor_enabled
       from public.profiles p join public."user" u on u.id = p.id where p.id = $1`,
    [userId],
  )
  if (FORCE_PASSWORD_CHANGE && prof?.must_change_password) return '/business/set-password'
  const staff = await queryOne<{ active: boolean }>(
    `select exists(select 1 from public.staff_access where user_id = $1 and status = 'active') as active`,
    [userId],
  )
  if (prof?.role === 'admin' || staff?.active) {
    return prof?.two_factor_enabled ? '/admin' : '/business/security?required=1'
  }
  return '/business'
}

export async function login(form: FormData) {
  const result = await run(async () => {
    const email = z.string().email().parse(form.get('email')).toLowerCase()
    const password = z.string().min(1).parse(form.get('password'))
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    if (!(await rateLimit('login', `${ip}:${email}`)).ok)
      throw new Err('Too many attempts. Try again in 15 minutes.', 'rate_limited')
    await verifyTurnstile(form.get('cf-turnstile-response')) // no-op without keys

    let userId: string
    try {
      // signInEmail returns the user + session and also writes the session
      // cookie via the nextCookies plugin. We use the returned user.id directly
      // instead of calling getSession() afterwards: getSession reads from the
      // *incoming* request headers, which don't contain the just-written cookie
      // yet — that caused it to return null and incorrectly throw "Invalid email
      // or password" even though the sign-in had succeeded.
      const signed = await auth.api.signInEmail({ body: { email, password }, headers: await headers() })
      if ('twoFactorRedirect' in signed && signed.twoFactorRedirect) {
        return { twoFactorRequired: true as const }
      }
      if (!signed?.user?.id) throw new Err('Invalid email or password', 'forbidden')
      userId = signed.user.id
    } catch (e) {
      if (e instanceof APIError) throw new Err('Invalid email or password', 'forbidden')
      throw e
    }

    return { to: await destinationFor(userId) }
  })

  // Return the redirect destination to the client instead of calling redirect()
  // inside a useTransition callback. redirect() throws NEXT_REDIRECT which can
  // bubble out of startTransition as an unhandled error in Next.js 16.
  return result
}

export async function completeTwoFactorSignIn() {
  return run(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) throw new Err('Authentication could not be completed.', 'forbidden')
    return { to: await destinationFor(session.user.id) }
  })
}

export async function setPassword(form: FormData) {
  const result = await run(async () => {
    const pw = z
      .string()
      .min(12)
      .max(72)
      .refine(
        (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v),
        'Use at least 12 characters with upper, lower and a number',
      )
      .parse(form.get('password'))

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw new Err('Not signed in', 'forbidden')
    const userId = session.user.id
    const email = (session.user.email ?? '').toLowerCase()

    // Update the credential password via Better Auth's internal adapter (same
    // path its changePassword route uses) — no current password required since
    // the active session is proof of identity.
    const ctx = await auth.$context
    const hashed = await ctx.password.hash(pw)
    await ctx.internalAdapter.updatePassword(userId, hashed)

    await query(`update public.profiles set must_change_password = false where id = $1`, [
      userId,
    ])
    await query(
      `update public.invitations set status = 'accepted'
       where email = $1 and status = 'sent'`,
      [email],
    )
    await audit({ id: userId, email }, null, 'auth.password.set')
    await sendEmail('password-changed', email, {})
  })

  if (result.ok) {
    const session = await auth.api.getSession({ headers: await headers() })
    redirect(session?.user?.id ? await destinationFor(session.user.id) : '/business/login')
  }
  return result
}

export async function requestReset(form: FormData) {
  return run(async () => {
    const email = z.string().email().parse(form.get('email')).toLowerCase()
    if (!(await rateLimit('passwordReset', email)).ok)
      throw new Err('Too many requests', 'rate_limited')

    // Same response either way — no account enumeration. Better Auth's
    // requestPasswordReset sends the reset email only when the account exists.
    try {
      await auth.api.requestPasswordReset({
        body: {
          email,
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/business/reset`,
        },
        headers: await headers(),
      })
      await audit({ id: null, email }, null, 'auth.password.reset.request')
    } catch {
      /* swallow — never reveal whether the address exists */
    }
    return { sent: true }
  })
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() })
  redirect('/business/login')
}
