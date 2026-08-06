import type { Metadata } from 'next'
import Link from 'next/link'
import { ResetForm } from './reset-form'

export const metadata: Metadata = { title: 'Choose a new password · Broker Portal' }

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  return (
    <div>
      <h1 className="text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em] text-[#1D1D1F]">
        Choose a new password
      </h1>
      {error || !token ? (
        <>
          <p className="mt-2 text-[17px] leading-[1.47] text-[#86868B]">
            This reset link is invalid or has expired. Request a new one to
            continue.
          </p>
          <div className="mt-8">
            <Link
              href="/business/forgot-password"
              className="text-[15px] text-[#0066CC] hover:underline"
            >
              Request a new link
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-[17px] leading-[1.47] text-[#86868B]">
            Use at least 12 characters with an uppercase letter, a lowercase
            letter and a number.
          </p>
          <ResetForm token={token} />
        </>
      )}
    </div>
  )
}
