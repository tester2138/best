import type { Metadata } from 'next'
import { requireUser } from '@/lib/guards'
import { query } from '@/lib/portal/db'
import { SettingsClient } from './settings-client'

export const metadata: Metadata = { title: 'Account settings' }

export default async function SettingsPage() {
  const user = await requireUser()
  const profile = await query<{ full_name: string | null; email: string; role: string }>(
    `select full_name, email, role from public.profiles where id = $1`,
    [user.id],
  )
  const p = profile[0]

  return (
    <div className="mx-auto max-w-2xl">
      <header className="anim-fade-up mb-10 pt-4 text-center">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-balance text-[clamp(28px,4.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em] text-[#1D1D1F]">
          Account settings
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-[17px] leading-[1.47] text-[#86868B]">
          Manage your profile, password, and active sessions.
        </p>
      </header>
      <SettingsClient
        fullName={p?.full_name ?? ''}
        email={p?.email ?? user.email}
        role={p?.role ?? 'brand_user'}
      />
    </div>
  )
}
