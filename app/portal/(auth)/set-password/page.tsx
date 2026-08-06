import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionContext } from '@/lib/guards'
import { SetPasswordForm } from './set-password-form'

export const metadata: Metadata = { title: 'Choose a password · Broker Portal' }

export default async function SetPasswordPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/portal/login')
  // If the password was already changed, there is nothing to do here.
  if (!ctx.profile.mustChangePassword) redirect('/portal')

  return (
    <div>
      <h1 className="text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em] text-[#1D1D1F]">
        Choose a password
      </h1>
      <p className="mt-2 text-[17px] leading-[1.47] text-[#86868B]">
        Set a new password to finish activating your account. Use at least 12
        characters with an uppercase letter, a lowercase letter and a number.
      </p>
      <SetPasswordForm />
    </div>
  )
}
