import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { getPool, query } from '@/lib/portal/db'
import { isAccountCreationAllowed } from '@/lib/portal/creation-context'
import { sendEmail } from '@/lib/email/send'

/**
 * Better Auth server instance (Blueprint Section 11, adapted from Supabase).
 *
 * - Email + password only. No OAuth, no public sign-up.
 * - Accounts are provisioned by the admin's `assignBrand` action (which wraps
 *   `signUpEmail` in `allowAccountCreation`). Env-listed admins may bootstrap
 *   their own account on first login. Every other sign-up is rejected by the
 *   `user.create.before` hook.
 * - `role` and `must_change_password` are the two server-controlled truths;
 *   they live in `public.profiles` and are seeded by the `user.create.after`
 *   hook. Guards (lib/guards.ts) read them per request.
 * - Password reset emails are sent through Brevo (lib/email/send.ts).
 */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

// Forced first-login password change (Blueprint Section 11.5). Default true.
const FORCE_PASSWORD_CHANGE = (process.env.FORCE_PASSWORD_CHANGE ?? 'true') !== 'false'

function exactOrigin(value?: string): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).origin
  } catch {
    return undefined
  }
}

function resolveAuthBaseURL(): string {
  const productionURL =
    exactOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    exactOrigin(process.env.VERCEL_URL)
  const deploymentURL = exactOrigin(process.env.VERCEL_URL)

  if (process.env.VERCEL_ENV === 'production') {
    return process.env.BETTER_AUTH_URL ?? productionURL ?? 'https://www.bestforex.io'
  }

  if (process.env.VERCEL_ENV === 'preview') {
    return deploymentURL ?? exactOrigin(process.env.V0_RUNTIME_URL) ?? 'http://localhost:3000'
  }

  return (
    exactOrigin(process.env.V0_RUNTIME_URL) ??
    exactOrigin(process.env.V0_DEV_APP_URL) ??
    exactOrigin(process.env.V0_BUILD_URL) ??
    exactOrigin(process.env.V0_SANDBOX_URL) ??
    deploymentURL ??
    'http://localhost:3000'
  )
}

function getTrustedOrigins(): string[] {
  const origins = new Set<string>()
  const add = (value?: string) => {
    const origin = exactOrigin(value)
    if (origin) origins.add(origin)
  }

  if (process.env.VERCEL_ENV === 'production') {
    add(process.env.VERCEL_URL)
    add(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    add(process.env.BETTER_AUTH_URL)
  } else if (process.env.VERCEL_ENV === 'preview') {
    add(process.env.VERCEL_URL)
  } else {
    add('http://localhost:3000')
    add(process.env.VERCEL_URL)
    add(process.env.V0_RUNTIME_URL)
    add(process.env.V0_DEV_APP_URL)
    add(process.env.V0_BUILD_URL)
    add(process.env.V0_SANDBOX_URL)
  }

  add(resolveAuthBaseURL())
  return [...origins]
}

export const auth = betterAuth({
  database: getPool(),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: resolveAuthBaseURL(),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false, // provisioning a broker must never create a session
    minPasswordLength: 12,
    maxPasswordLength: 72,
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60, // 60 minutes (matches email copy)
    sendResetPassword: async ({ user, url }) => {
      await sendEmail('password-reset', user.email, { link: url })
    },
  },
  trustedOrigins: getTrustedOrigins(),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  // Lets server actions (actions/auth.ts) set/clear the session cookie when
  // they call auth.api.signInEmail / signOut. Must be the last plugin.
  plugins: [nextCookies()],
  databaseHooks: {
    user: {
      create: {
        // Gate: reject any sign-up that is neither an admin bootstrap nor an
        // admin-initiated provisioning call. Returning false aborts creation.
        before: async (user) => {
          const email = (user.email ?? '').toLowerCase()
          const isAdmin = ADMIN_EMAILS.includes(email)
          if (!isAdmin && !isAccountCreationAllowed()) {
            return false
          }
          return
        },
        // Seed the domain profile row with role + must_change_password.
        after: async (user) => {
          const email = (user.email ?? '').toLowerCase()
          const isAdmin = ADMIN_EMAILS.includes(email)
          const role = isAdmin ? 'admin' : 'brand_user'
          const mustChange = isAdmin ? false : FORCE_PASSWORD_CHANGE
          try {
            await query(
              `insert into public.profiles (id, email, full_name, role, must_change_password)
               values ($1, $2, $3, $4, $5)
               on conflict (id) do update
                 set email = excluded.email,
                     full_name = coalesce(excluded.full_name, public.profiles.full_name)`,
              [user.id, email, user.name ?? null, role, mustChange],
            )
          } catch (err) {
            console.error('[v0] profiles seed failed for user', user.id, err)
          }
        },
      },
    },
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})
