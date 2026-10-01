import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { queryOne } from '@/lib/portal/db'
import { isMfaSessionFresh } from '@/lib/staff-permissions'
import { AUTH_SURFACE_PATHS, type AuthSurface } from '@/lib/portal/auth-routing'
import { SecurityClient } from './security-client'

export async function SecurityPage({ surface }: { surface: AuthSurface }) {
  const paths = AUTH_SURFACE_PATHS[surface]
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect(paths.login)
  const userId = session.user.id
  const [profile, staff, account, factor, invitation] = await Promise.all([
    queryOne<{ role: string }>(`select role from public.profiles where id = $1`, [userId]),
    queryOne<{ active: boolean }>(
      `select exists(select 1 from public.staff_access where user_id = $1 and status = 'active') as active`,
      [userId],
    ),
    queryOne<{ enabled: boolean }>(
      `select "twoFactorEnabled" as enabled from public."user" where id = $1`,
      [userId],
    ),
    queryOne<{ verified: boolean; created_at: string }>(
      `select verified, "createdAt"::text as created_at from public."twoFactor" where "userId" = $1`,
      [userId],
    ),
    queryOne<{ expired: boolean }>(
      `select exists (
         select 1 from public.staff_invitations i
         join public.profiles p on lower(p.email) = lower(i.email)
         join public.staff_access sa on sa.user_id = p.id and sa.status = 'active'
          where p.id = $1
            and i.status in ('pending', 'expired')
            and i.expires_at <= now()
       ) as expired`,
      [userId],
    ),
  ])

  const isPrivileged = profile?.role === 'admin' || staff?.active === true
  if (!isPrivileged) {
    if (surface === 'admin') redirect(`${paths.login}?error=access-denied`)
    redirect(paths.home)
  }

  const mfaEnabled = account?.enabled === true && factor?.verified === true
  const sessionFresh = isMfaSessionFresh(
    mfaEnabled,
    factor?.created_at ?? null,
    session.session.createdAt,
  )

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
      <SecurityClient
        email={session.user.email ?? ''}
        mfaEnabled={mfaEnabled}
        setupPending={!!factor && !factor.verified}
        sessionFresh={sessionFresh}
        invitationExpired={profile?.role !== 'admin' && invitation?.expired === true}
        loginPath={paths.login}
      />
    </main>
  )
}
