'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

/**
 * Portal-scoped error boundary. Catches any unhandled errors within /portal/*
 * and shows a clean inline message instead of the full-page crash screen.
 * Auto-redirects to the login page after 4 seconds.
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[portal] boundary caught:', error)
    const t = setTimeout(() => router.replace('/business/login'), 4000)
    return () => clearTimeout(t)
  }, [error, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-10 text-center shadow-[0_4px_40px_rgba(0,0,0,0.08)]">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#FFE5E5]">
          <AlertCircle className="size-7 text-[#E30000]" strokeWidth={1.5} />
        </span>
        <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
          Something went wrong
        </h2>
        <p className="mt-2 text-[15px] leading-[1.47] text-[#86868B]">
          We&apos;re redirecting you back to the login page.
        </p>
        <div className="mt-7 flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-full border border-[#D2D2D7] py-2.5 text-[15px] font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7]"
          >
            Try again
          </button>
          <button
            onClick={() => router.replace('/business/login')}
            className="flex-1 rounded-full bg-[#0071E3] py-2.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}
