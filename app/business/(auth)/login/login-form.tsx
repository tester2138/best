'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { login } from '@/app/actions/auth'
import type { AuthSurface } from '@/lib/portal/auth-routing'

export function LoginForm({
  next,
  surface = 'business',
}: {
  next?: string
  surface?: AuthSurface
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await login(formData)
        if (!res) return
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

  return (
    <form action={onSubmit} className="mt-9 flex flex-col gap-4">
      <input type="hidden" name="surface" value={surface} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

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

      {error ? (
        <p role="alert" className="anim-fade-up rounded-xl bg-[#E30000]/[0.06] px-4 py-3 text-[13px] text-[#E30000]">
          {error}
        </p>
      ) : null}
    </form>
  )
}
