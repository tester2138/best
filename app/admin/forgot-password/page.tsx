import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgotForm } from '@/app/business/(auth)/forgot-password/forgot-form'

export const metadata: Metadata = {
  title: 'Reset admin password · BestForex.io',
  robots: { index: false, follow: false },
}

export default function AdminForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-balance text-3xl font-semibold tracking-tight">Reset admin password</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Enter your staff email and we&apos;ll send a password reset link if an account exists.
      </p>
      <ForgotForm surface="admin" />
      <Link href="/admin/login" className="mt-6 text-sm text-primary underline-offset-4 hover:underline">
        Back to admin sign in
      </Link>
    </main>
  )
}
