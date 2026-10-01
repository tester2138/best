import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/app/business/(auth)/login/login-form'

export const metadata: Metadata = {
  title: 'Admin sign in · BestForex.io',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <div>
        <p className="text-sm font-medium text-primary">BestForex.io staff</p>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sign in with an active staff account to manage the site.
        </p>
      </div>

      {error === 'access-denied' ? (
        <p role="alert" className="rounded-lg border border-border bg-muted p-3 text-sm leading-relaxed">
          This account does not have access to the admin console. Sign in with an active staff account.
        </p>
      ) : null}
      {error === 'invitation-expired' ? (
        <p role="alert" className="rounded-lg border border-border bg-muted p-3 text-sm leading-relaxed">
          This staff invitation has expired. Ask an administrator to reissue it.
        </p>
      ) : null}

      <LoginForm surface="admin" next={next} />

      <div className="flex items-center justify-between gap-4 text-sm">
        <Link href="/admin/forgot-password" className="text-primary underline-offset-4 hover:underline">
          Forgot password?
        </Link>
        <Link href="/" className="text-muted-foreground underline-offset-4 hover:underline">
          Return to BestForex.io
        </Link>
      </div>
    </main>
  )
}
