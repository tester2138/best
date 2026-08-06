import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in · Broker Portal' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <div>
      <h1 className="text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em] text-[#1D1D1F]">
        Sign in
      </h1>
      <p className="mt-2 text-[17px] leading-[1.47] text-[#86868B]">
        Welcome back. Pick up where you left off.
      </p>
      <LoginForm next={next} />
      <div className="mt-8 text-center">
        <Link
          href="/business/forgot-password"
          className="rounded-full text-[15px] text-[#0066CC] transition-colors hover:underline"
        >
          Forgot your password?
        </Link>
      </div>
    </div>
  )
}
