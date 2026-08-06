import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgotForm } from './forgot-form'

export const metadata: Metadata = { title: 'Reset your password · Broker Portal' }

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em] text-[#1D1D1F]">
        Reset your password
      </h1>
      <p className="mt-2 text-[17px] leading-[1.47] text-[#86868B]">
        Enter your account email and we&apos;ll send you a link to choose a new
        password.
      </p>
      <ForgotForm />
      <div className="mt-8 text-center">
        <Link href="/portal/login" className="text-[15px] text-[#0066CC] hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
