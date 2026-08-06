'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { requestReset } from '@/app/actions/auth'

export function ForgotForm() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await requestReset(formData)
      if (res.ok) setSent(true)
      else setError(res.error)
    })
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-xl bg-muted p-4">
        <p className="text-[13px] leading-relaxed text-foreground">
          If an account exists for that email, a password reset link is on its
          way. The link expires in 60 minutes.
        </p>
      </div>
    )
  }

  return (
    <form action={onSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-[13px] font-medium">
          Email
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-[#D70015]">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="mt-2 h-11 w-full">
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  )
}
