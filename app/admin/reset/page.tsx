import type { Metadata } from 'next'
import Link from 'next/link'
import { ResetForm } from '@/app/business/(auth)/reset/reset-form'

export const metadata: Metadata = {
  title: 'Choose a new admin password · BestForex.io',
  robots: { index: false, follow: false },
}

export default async function AdminResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-balance text-3xl font-semibold tracking-tight">Choose a new password</h1>
      {error || !token ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This reset link is invalid or has expired. Request a new one to continue.
          </p>
          <Link href="/admin/forgot-password" className="mt-6 text-sm text-primary underline-offset-4 hover:underline">
            Request a new link
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Use at least 12 characters with an uppercase letter, a lowercase letter and a number.
          </p>
          <ResetForm token={token} surface="admin" />
        </>
      )}
    </main>
  )
}
