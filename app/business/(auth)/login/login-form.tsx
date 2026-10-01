'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { login, completeTwoFactorSignIn } from '@/app/actions/auth'
import { authClient } from '@/lib/auth-client'

export function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const router = useRouter()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await login(formData)
        if (!res) return
        if (res.ok && res.data?.twoFactorRequired) {
          setTwoFactorRequired(true)
          return
        }
        if (res.ok && res.data?.to) {
          router.push(res.data.to)
        } else if (!res.ok) {
          setError(res.error ?? 'Invalid email or password')
        }
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  function verifySecondFactor() {
    setError(null)
    const code = verificationCode.trim()
    if (!code) {
      setError('Enter your authenticator code or a recovery code.')
      return
    }
    startTransition(async () => {
      try {
        const result = useRecoveryCode
          ? await authClient.twoFactor.verifyBackupCode({ code })
          : await authClient.twoFactor.verifyTotp({ code, trustDevice: false })
        if (result.error) {
          console.log('[v0] 2FA verification rejected', {
            status: result.error.status,
            code: result.error.code,
          })
          setError('That verification code could not be accepted.')
          return
        }
        const completed = await completeTwoFactorSignIn()
        if (!completed.ok) {
          setError(completed.error ?? 'Authentication could not be completed.')
          return
        }
        if (!completed.data?.to) {
          setError('Authentication could not be completed.')
          return
        }
        router.push(completed.data.to)
      } catch {
        setError('That verification code could not be accepted.')
      }
    })
  }

  return (
    <form action={onSubmit} className="mt-9 flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {!twoFactorRequired ? (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-[13px] font-medium text-[#1D1D1F]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@brokerage.com"
              className="h-12 rounded-xl border border-[#D2D2D7] bg-white px-4 text-[17px] text-[#1D1D1F] placeholder:text-[#86868B] transition-[border-color] duration-200 focus:border-[#0071E3]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-[13px] font-medium text-[#1D1D1F]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-12 rounded-xl border border-[#D2D2D7] bg-white px-4 text-[17px] text-[#1D1D1F] transition-[border-color] duration-200 focus:border-[#0071E3]"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="p-btn-primary mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[17px] disabled:opacity-40"
          >
            {pending ? <><Loader2 className="size-4 animate-spin" />Signing in…</> : 'Sign in'}
          </button>
        </>
      ) : (
        <section aria-labelledby="two-factor-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="two-factor-heading" className="text-base font-semibold text-[#1D1D1F]">Verify your identity</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#626268]">
              Enter the current code from your authenticator app. You can use a recovery code if needed.
            </p>
          </div>
          <label htmlFor="verification-code" className="flex flex-col gap-2 text-[13px] font-medium text-[#1D1D1F]">
            {useRecoveryCode ? 'Recovery code' : 'Authenticator code'}
            <input
              id="verification-code"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode={useRecoveryCode ? 'text' : 'numeric'}
              required
              autoFocus
              className="h-12 rounded-xl border border-[#D2D2D7] bg-white px-4 text-[17px] text-[#1D1D1F] focus:border-[#0071E3]"
            />
          </label>
          <button
            type="button"
            onClick={verifySecondFactor}
            disabled={pending || !verificationCode.trim()}
            className="p-btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-full text-[17px] disabled:opacity-40"
          >
            {pending ? <><Loader2 className="size-4 animate-spin" />Verifying…</> : 'Verify and continue'}
          </button>
          <button
            type="button"
            className="text-sm text-[#0066CC] underline-offset-4 hover:underline"
            onClick={() => { setUseRecoveryCode((value) => !value); setVerificationCode(''); setError(null) }}
          >
            {useRecoveryCode ? 'Use authenticator code instead' : 'Use a recovery code instead'}
          </button>
          <button
            type="button"
            className="text-sm text-[#626268] underline-offset-4 hover:underline"
            onClick={() => { setTwoFactorRequired(false); setVerificationCode(''); setError(null) }}
          >
            Back to sign in
          </button>
        </section>
      )}

      {error ? (
        <p role="alert" className="anim-fade-up rounded-xl bg-[#E30000]/[0.06] px-4 py-3 text-[13px] text-[#E30000]">
          {error}
        </p>
      ) : null}
    </form>
  )
}
