'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Offer } from '@/types/portal'
import type { ActionResult } from '@/types/portal'

type SaveAction = (raw: unknown) => Promise<ActionResult<{ id: string }>>

/** Convert an ISO string to the value a datetime-local input expects. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

/** Convert a datetime-local value back to a full ISO string. */
function toIso(local: string): string | null {
  if (!local) return null
  return new Date(local).toISOString()
}

const CAPS = {
  title: 60,
  subtitle: 90,
  description: 500,
  terms: 1000,
  cta_label: 25,
}

export function OfferForm({
  brandId,
  offer,
  onSaved,
  onSave,
}: {
  brandId: string
  offer: Offer | null
  onSaved: () => void
  onSave: SaveAction
}) {
  const [form, setForm] = useState({
    title: offer?.title ?? '',
    subtitle: offer?.subtitle ?? '',
    description: offer?.description ?? '',
    terms: offer?.terms ?? '',
    cta_label: offer?.cta_label ?? 'Claim offer',
    cta_url: offer?.cta_url ?? 'https://',
    starts_at: toLocalInput(offer?.starts_at ?? null),
    ends_at: toLocalInput(offer?.ends_at ?? null),
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await onSave({
        brandId,
        offerId: offer?.id,
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        terms: form.terms,
        cta_label: form.cta_label,
        cta_url: form.cta_url,
        starts_at: toIso(form.starts_at),
        ends_at: toIso(form.ends_at),
      })
      if (!res.ok) setError(res.error)
      else onSaved()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <Field label="Title" cap={CAPS.title} value={form.title}>
        <Input
          value={form.title}
          maxLength={CAPS.title}
          onChange={(e) => set('title', e.target.value)}
          required
        />
      </Field>

      <Field label="Subtitle" cap={CAPS.subtitle} value={form.subtitle} optional>
        <Input
          value={form.subtitle}
          maxLength={CAPS.subtitle}
          onChange={(e) => set('subtitle', e.target.value)}
        />
      </Field>

      <Field label="Description" cap={CAPS.description} value={form.description} optional>
        <Textarea
          value={form.description}
          maxLength={CAPS.description}
          rows={3}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <Field label="Terms & conditions" cap={CAPS.terms} value={form.terms}>
        <Textarea
          value={form.terms}
          maxLength={CAPS.terms}
          rows={4}
          onChange={(e) => set('terms', e.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Button label" cap={CAPS.cta_label} value={form.cta_label}>
          <Input
            value={form.cta_label}
            maxLength={CAPS.cta_label}
            onChange={(e) => set('cta_label', e.target.value)}
          />
        </Field>
        <div className="space-y-1.5">
          <Label>Destination URL</Label>
          <Input
            type="url"
            value={form.cta_url}
            onChange={(e) => set('cta_url', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Starts</Label>
          <Input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => set('starts_at', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Ends</Label>
          <Input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => set('ends_at', e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#0066CC] text-white hover:bg-[#0066CC]/90"
        >
          {pending ? 'Saving…' : 'Save draft'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Saving stores a draft. Use Submit on the offers list to send it for review.
      </p>
    </form>
  )
}

function Field({
  label,
  cap,
  value,
  optional,
  children,
}: {
  label: string
  cap: number
  value: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>
          {label}
          {optional && <span className="ml-1 text-muted-foreground">(optional)</span>}
        </Label>
        <span className="text-xs text-muted-foreground">
          {value.length}/{cap}
        </span>
      </div>
      {children}
    </div>
  )
}
