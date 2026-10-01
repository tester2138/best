import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionContext } from '@/lib/guards'
import { SetPasswordForm } from '@/app/business/(auth)/set-password/set-password-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Choose an admin password · BestForex.io',
  robots: { index: false, follow: false },
}

export default async function AdminSetPasswordPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/admin/login')
  if (!ctx.profile.mustChangePassword) redirect('/admin')

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-balance text-3xl font-semibold tracking-tight">Choose a password</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Set a new password to finish activating your staff account. Use at least 12 characters with an uppercase letter, a lowercase letter and a number.
      </p>
      <SetPasswordForm surface="admin" />
    </main>
  )
}
