'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { setPassword } from '@/app/actions/auth'
import type { AuthSurface } from '@/lib/portal/auth-routing'

function scorePassword(v: string): { ok: boolean; hint: string } {
  const checks = [/[a-z]/.test(v), /[A-Z]/.test(v), /\d/.test(v), v.length >= 12]
  const ok = checks.every(Boolean)
  const missing: string[] = []
  if (v.length < 12) missing.push('12+ characters')
  if (!/[A-Z]/.test(v)) missing.push('an uppercase letter')
  if (!/[a-z]/.test(v)) missing.push('a lowercase letter')
  if (!/\d/.test(v)) missing.push('a number')
  return { ok, hint: ok ? 'Looks good' : `Needs ${missing.join(', ')}` }
}

export function SetPasswordForm({ surface = 'business' }: { surface?: AuthSurface }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { ok, hint } = scorePassword(pw)
  const matches = pw.length > 0 && pw === confirm
  const canSubmit = ok && matches && !pending

  function onSubmit(formData: FormData) {
    setError(null)
    if (!matches) {
      setError('The two passwords do not match.')
      return
    }
    startTransition(async () => {
      const res = await setPassword(formData)
      if (res && !res.ok) setError(res.error)
    })
  }

  return (
    <form action={onSubmit} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="surface" value={surface} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-[13px] font-medium">
          New password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {pw.length > 0 ? (
          <p className={`text-[12px] ${ok ? 'text-[#1D7A38]' : 'text-muted-foreground'}`}>
            {hint}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm" className="text-[13px] font-medium">
          Confirm password
        </Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {confirm.length > 0 && !matches ? (
          <p className="text-[12px] text-[#D70015]">Passwords do not match.</p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-[#D70015]">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={!canSubmit} className="mt-2 h-11 w-full">
        {pending ? 'Saving…' : 'Save password'}
      </Button>
    </form>
  )
}
