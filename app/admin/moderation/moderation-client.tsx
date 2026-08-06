'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SECTIONS, type SectionKey, type FieldDef } from '@/lib/content/registry'
import { approveItem, rejectItem, bulkApproveClean } from '@/app/actions/moderation'

export interface QueueItem {
  id: string
  brandId: string
  brandName: string
  brandSlug: string
  targetType: 'section' | 'offer' | 'media'
  targetId: string
  payload: Record<string, unknown>
  autoFlags: { field?: string; detail?: string }[]
  submittedBy: string | null
  createdAt: string
  published: Record<string, unknown> | null
  offer: Record<string, unknown> | null
  media: {
    public_url: string
    width: number | null
    height: number | null
    bytes: number | null
    alt_text: string | null
    kind: string
  } | null
}

const TYPE_LABEL: Record<QueueItem['targetType'], string> = {
  section: 'Section',
  offer: 'Offer',
  media: 'Media',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) {
    if (v.length === 0) return '—'
    if (typeof v[0] === 'object') return `${v.length} item(s)`
    return v.join(', ')
  }
  if (typeof v === 'object') return JSON.stringify(v)
  const s = String(v)
  // Strip HTML tags for rich-text previews.
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function ModerationClient({ items }: { items: QueueItem[] }) {
  const [list, setList] = useState(items)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  const cleanCount = list.filter((i) => i.autoFlags.length === 0).length

  function remove(id: string) {
    setList((prev) => prev.filter((i) => i.id !== id))
  }

  function onApprove(id: string) {
    setBusyId(id)
    startTransition(async () => {
      const res = await approveItem({ id })
      setBusyId(null)
      if (res.ok) {
        toast.success('Approved and published')
        remove(id)
      } else {
        toast.error(res.error ?? 'Could not approve')
      }
    })
  }

  function onReject() {
    if (!rejectId) return
    const id = rejectId
    if (note.trim().length === 0) {
      toast.error('A note is required')
      return
    }
    setBusyId(id)
    startTransition(async () => {
      const res = await rejectItem({ id, note: note.trim() })
      setBusyId(null)
      if (res.ok) {
        toast.success('Rejected')
        remove(id)
        setRejectId(null)
        setNote('')
      } else {
        toast.error(res.error ?? 'Could not reject')
      }
    })
  }

  function onBulk() {
    startTransition(async () => {
      const res = await bulkApproveClean()
      if (res.ok) {
        toast.success(`Approved ${res.data?.approved ?? 0} clean item(s)`)
        setList((prev) => prev.filter((i) => i.autoFlags.length > 0))
      } else {
        toast.error(res.error ?? 'Bulk approve failed')
      }
    })
  }

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">Nothing pending. The queue is clear.</p>
      </div>
    )
  }

  // Group by brand, preserving oldest-first order.
  const groups = new Map<string, QueueItem[]>()
  for (const item of list) {
    const arr = groups.get(item.brandName) ?? []
    arr.push(item)
    groups.set(item.brandName, arr)
  }

  return (
    <div className="flex flex-col gap-8">
      {cleanCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {cleanCount} item{cleanCount === 1 ? '' : 's'} with no auto-flags can be approved in bulk.
          </p>
          <Button variant="outline" size="sm" onClick={onBulk} disabled={pending}>
            Bulk approve clean items
          </Button>
        </div>
      )}

      {[...groups.entries()].map(([brandName, brandItems]) => (
        <section key={brandName} className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {brandName}
          </h2>
          {brandItems.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{TYPE_LABEL[item.targetType]}</Badge>
                <span className="text-sm font-medium">{item.targetId}</span>
                <span className="text-xs text-muted-foreground">· {relativeTime(item.createdAt)}</span>
                {item.submittedBy && (
                  <span className="text-xs text-muted-foreground">· {item.submittedBy}</span>
                )}
              </div>

              {item.autoFlags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.autoFlags.map((f, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
                    >
                      {f.detail ?? f.field ?? 'flagged'}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4">
                {item.targetType === 'section' && <SectionDiff item={item} />}
                {item.targetType === 'offer' && <OfferPreview payload={item.payload} />}
                {item.targetType === 'media' && item.media && <MediaPreview media={item.media} />}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => onApprove(item.id)}
                  disabled={pending && busyId === item.id}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRejectId(item.id)
                    setNote('')
                  }}
                  disabled={pending && busyId === item.id}
                >
                  Reject
                </Button>
              </div>
            </article>
          ))}
        </section>
      ))}

      <Dialog open={rejectId !== null} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
            <DialogDescription>
              Add a note explaining what needs to change. The brand receives this by email.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="e.g. The headline contains a promotional claim we can't verify."
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectId(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onReject} disabled={pending}>
              Reject with note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Section diff ─────────────────────────────────────────────────────────── */

function SectionDiff({ item }: { item: QueueItem }) {
  const def = SECTIONS[item.targetId as SectionKey]
  const fields: FieldDef[] = def?.fields ?? []
  const published = item.published ?? {}

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-[160px_1fr_1fr] bg-muted/50 text-xs font-medium text-muted-foreground">
        <div className="px-3 py-2">Field</div>
        <div className="px-3 py-2">Current</div>
        <div className="px-3 py-2">Submitted</div>
      </div>
      {fields.map((f) => {
        const before = displayValue(published[f.key])
        const after = displayValue(item.payload[f.key])
        const changed = before !== after
        return (
          <div
            key={f.key}
            className={`grid grid-cols-[160px_1fr_1fr] border-t border-border text-sm ${
              changed ? 'bg-primary/5' : ''
            }`}
          >
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">{f.label}</div>
            <div className="px-3 py-2 text-muted-foreground">{before}</div>
            <div className={`px-3 py-2 ${changed ? 'font-medium text-foreground' : ''}`}>
              {after}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Offer preview ────────────────────────────────────────────────────────── */

function OfferPreview({ payload }: { payload: Record<string, unknown> }) {
  const p = payload as {
    title?: string
    subtitle?: string
    description?: string
    terms?: string
    cta_label?: string
    cta_url?: string
  }
  return (
    <div className="max-w-md rounded-lg border border-border bg-background p-4">
      <p className="text-base font-semibold">{p.title || 'Untitled offer'}</p>
      {p.subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{p.subtitle}</p>}
      {p.description && <p className="mt-2 text-sm">{p.description}</p>}
      {p.terms && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Terms:</span> {p.terms}
        </p>
      )}
      <div className="mt-3 inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
        {p.cta_label || 'Claim offer'}
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">{p.cta_url}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">Terms apply. 18+. Trade responsibly.</p>
    </div>
  )
}

/* ── Media preview ────────────────────────────────────────────────────────── */

function MediaPreview({ media }: { media: NonNullable<QueueItem['media']> }) {
  const kb = media.bytes ? Math.round(media.bytes / 1024) : null
  return (
    <div className="flex flex-col gap-2">
      <div className="relative inline-block max-w-sm overflow-hidden rounded-lg border border-border">
        <Image
          src={media.public_url || '/placeholder.svg'}
          alt={media.alt_text ?? 'Submitted media'}
          width={media.width ?? 640}
          height={media.height ?? 360}
          className="h-auto w-full"
          unoptimized
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {media.kind} · {media.width ?? '?'}×{media.height ?? '?'}px
        {kb ? ` · ${kb} KB` : ''}
      </p>
      {media.alt_text && <p className="text-xs text-muted-foreground">Alt: {media.alt_text}</p>}
    </div>
  )
}
