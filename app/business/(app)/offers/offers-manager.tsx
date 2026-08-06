'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Pause, Play, Send, Archive, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { StatusChip } from '../status-chip'
import { OfferForm } from './offer-form'
import { saveOffer, submitOffer, setOfferStatus } from '@/app/actions/offers'
import type { Offer } from '@/types/portal'

export function OffersManager({
  brandId,
  canWrite,
  initialOffers,
}: {
  brandId: string
  canWrite: boolean
  initialOffers: Offer[]
}) {
  const router = useRouter()
  const [offers] = useState(initialOffers)
  const [editing, setEditing] = useState<Offer | 'new' | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function lifecycle(offerId: string, action: 'pause' | 'resume' | 'archive') {
    setError(null)
    startTransition(async () => {
      const res = await setOfferStatus({ brandId, offerId, action })
      if (!res.ok) setError(res.error)
      else router.refresh()
    })
  }

  function submit(offerId: string) {
    setError(null)
    startTransition(async () => {
      const res = await submitOffer({ brandId, offerId })
      if (!res.ok) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {canWrite && (
        <div className="anim-fade-up anim-d-1 flex justify-center">
          <Button
            onClick={() => setEditing('new')}
            className="p-btn-primary h-11 rounded-full px-6 text-[15px]"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New offer
          </Button>
        </div>
      )}

      {offers.length === 0 ? (
        <div className="anim-fade-up anim-d-2 rounded-[18px] bg-[#F5F5F7] px-10 py-16 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <Tag className="size-6 text-[#0071E3]" strokeWidth={1.5} />
          </span>
          <p className="mt-5 text-[17px] font-semibold text-[#1D1D1F]">No offers yet</p>
          <p className="mx-auto mt-1 max-w-xs text-[15px] leading-[1.47] text-[#86868B]">
            Create one to promote a bonus or campaign on your public profile.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-[#E8E8ED]">
          {offers.map((o, i) => (
            <div
              key={o.id}
              className={`flex items-start justify-between gap-4 px-6 py-4 ${
                i > 0 ? 'border-t border-[#E8E8ED]' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{o.title}</span>
                  <StatusChip status={o.status} />
                </div>
                {o.subtitle && (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{o.subtitle}</p>
                )}
              </div>
              {canWrite && (
                <div className="flex shrink-0 items-center gap-1">
                  <IconBtn label="Edit" onClick={() => setEditing(o)} disabled={pending}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  {(o.status === 'draft' || o.status === 'rejected') && (
                    <IconBtn label="Submit" onClick={() => submit(o.id)} disabled={pending}>
                      <Send className="h-4 w-4" />
                    </IconBtn>
                  )}
                  {o.status === 'active' && (
                    <IconBtn label="Pause" onClick={() => lifecycle(o.id, 'pause')} disabled={pending}>
                      <Pause className="h-4 w-4" />
                    </IconBtn>
                  )}
                  {o.status === 'paused' && (
                    <IconBtn label="Resume" onClick={() => lifecycle(o.id, 'resume')} disabled={pending}>
                      <Play className="h-4 w-4" />
                    </IconBtn>
                  )}
                  <IconBtn label="Archive" onClick={() => lifecycle(o.id, 'archive')} disabled={pending}>
                    <Archive className="h-4 w-4" />
                  </IconBtn>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing === 'new' ? 'New offer' : 'Edit offer'}</SheetTitle>
            <SheetDescription>
              Editing a live offer sends it back for review while the current version keeps running.
            </SheetDescription>
          </SheetHeader>
          {editing && (
            <OfferForm
              brandId={brandId}
              offer={editing === 'new' ? null : editing}
              onSaved={() => {
                setEditing(null)
                router.refresh()
              }}
              onSave={saveOffer}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  )
}
