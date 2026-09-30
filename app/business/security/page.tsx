import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { queryOne } from '@/lib/portal/db'
import { isMfaSessionFresh } from '@/lib/staff-permissions'
import { SecurityClient } from './security-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Account security · BestForex Portal', robots: { index: false, follow: false } }

export default async function BusinessSecurityPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/business/login')
  const userId = session.user.id
  const [profile, staff, account, factor] = await Promise.all([
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
  ])

  const isPrivileged = profile?.role === 'admin' || staff?.active === true
  if (!isPrivileged) redirect('/business')

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
      />
    </main>
  )
}
