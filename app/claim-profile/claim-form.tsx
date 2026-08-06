'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { submitClaim } from '@/app/actions/claims'

export function ClaimForm({ slug, brokerName }: { slug: string; brokerName: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await submitClaim({
        slug,
        brokerName,
        fullName: String(fd.get('fullName') ?? ''),
        workEmail: String(fd.get('workEmail') ?? ''),
        message: String(fd.get('message') ?? ''),
      })
      if (res.ok) {
        setDone(true)
      } else {
        setError(res.error ?? 'Could not send your request. Please try again.')
      }
    })
  }

  if (done) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BadgeCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">Request received</h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Thanks — our team will verify your details and email you at the address you provided
          with next steps for managing {brokerName}.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" placeholder="Jane Smith" required maxLength={120} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workEmail">Work email</Label>
          <Input
            id="workEmail"
            name="workEmail"
            type="email"
            placeholder={`you@${slug}.com`}
            required
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            Use an email on the broker&apos;s official domain to speed up verification.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="message">Message (optional)</Label>
          <Textarea
            id="message"
            name="message"
            rows={4}
            maxLength={1000}
            placeholder="Tell us about your role and anything we should know."
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Request access'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By requesting access you confirm you are authorised to represent {brokerName}.
        </p>
      </form>
    </Card>
  )
}
