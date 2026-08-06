'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { resetPassword } from '@/lib/auth-client'

function valid(v: string) {
  return v.length >= 12 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v)
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const canSubmit = valid(pw) && pw === confirm && !pending

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pw !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    startTransition(async () => {
      const { error } = await resetPassword({ newPassword: pw, token })
      if (error) {
        setError(error.message ?? 'This reset link is invalid or has expired.')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/portal/login'), 1200)
    })
  }

  if (done) {
    return (
      <div className="mt-6 rounded-xl bg-muted p-4">
        <p className="text-[13px] text-foreground">
          Your password has been updated. Redirecting you to sign in…
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-[13px] font-medium">
          New password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
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
        {confirm.length > 0 && pw !== confirm ? (
          <p className="text-[12px] text-[#D70015]">Passwords do not match.</p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-[#D70015]">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={!canSubmit} className="mt-2 h-11 w-full">
        {pending ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  )
}
