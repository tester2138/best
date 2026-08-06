'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { zodFor } from '@/lib/content/schema'
import { SECTIONS, type SectionKey } from '@/lib/content/registry'
import { saveDraft, publishSection, discardDraft } from '@/app/actions/sections'
import { FieldControl } from './field-control'

type Values = Record<string, unknown>

interface SectionFormProps {
  brandId: string
  brandSlug: string
  sectionKey: SectionKey
  initialDraft: Values | null
  initialStatus: string
  version: number
  canWrite: boolean
  publicUrl: string
}

export function SectionForm({
  brandId,
  brandSlug,
  sectionKey,
  initialDraft,
  initialStatus,
  version: initialVersion,
  canWrite,
  publicUrl,
}: SectionFormProps) {
  const def = SECTIONS[sectionKey]
  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    getValues,
  } = useForm<Values>({
    resolver: zodResolver(zodFor(sectionKey)),
    defaultValues: initialDraft ?? {},
    mode: 'onChange',
  })

  const [version, setVersion] = useState(initialVersion)
  const [status, setStatus] = useState(initialStatus)
  const [saveState, setSaveState] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [conflict, setConflict] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const watched = useWatch({ control })

  const runSave = useCallback(
    async (values: Values) => {
      setSaving(true)
      setSaveState('Saving…')
      const res = await saveDraft({ brandId, sectionKey, values, version })
      setSaving(false)
      if (res.ok) {
        if (res.data) setVersion(res.data.version)
        setStatus('draft')
        const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setSaveState(`Saved · ${t}`)
      } else if (res.code === 'version_conflict') {
        setConflict(true)
        setSaveState('')
      } else if (res.code === 'validation') {
        setSaveState('')
      } else {
        setSaveState('')
        toast.error(res.error ?? 'Could not save')
      }
    },
    [brandId, sectionKey, version],
  )

  // Autosave: debounce 1500ms after any change.
  useEffect(() => {
    if (!canWrite) return
    if (!isDirty) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void runSave(getValues())
    }, 1500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // Re-arm whenever the watched values change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watched), canWrite, isDirty])

  const onPublish = handleSubmit(async (values) => {
    setPublishing(true)
    // Ensure the latest draft is saved first so the server publishes fresh content.
    const saved = await saveDraft({ brandId, sectionKey, values, version })
    if (!saved.ok) {
      setPublishing(false)
      if (saved.code === 'version_conflict') setConflict(true)
      else toast.error(saved.error ?? 'Could not save before publishing')
      return
    }
    const nextVersion = saved.data?.version ?? version
    setVersion(nextVersion)
    const res = await publishSection({ brandId, sectionKey, version: nextVersion })
    setPublishing(false)
    if (!res.ok) {
      if (res.code === 'version_conflict') setConflict(true)
      else toast.error(res.error ?? 'Could not publish')
      return
    }
    if (res.data?.queued) {
      setStatus('pending_review')
      toast.success('Sent for review')
    } else {
      setStatus('synced')
      toast.success('Published live')
    }
  })

  async function onDiscard() {
    const res = await discardDraft({ brandId, sectionKey, version })
    if (res.ok) {
      toast.success('Draft discarded')
      window.location.reload()
    } else {
      toast.error(res.error ?? 'Could not discard')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-5">
        {def.fields.map((field) => (
          <FieldControl
            key={field.key}
            field={field}
            control={control}
            error={errors[field.key]?.message as string | undefined}
          />
        ))}
      </form>

      {canWrite && (
        <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-3 border-t bg-background/95 px-6 py-3 backdrop-blur">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {status === 'pending_review' ? 'In review — editing locked' : saveState}
          </span>
          <div className="flex items-center gap-2">
            {status === 'draft' && (
              <Button type="button" variant="ghost" onClick={onDiscard} disabled={saving || publishing}>
                Discard
              </Button>
            )}
            {status === 'synced' && (
              <Button asChild variant="ghost">
                <Link href={publicUrl} target="_blank" rel="noopener">
                  View live <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            <Button
              type="button"
              onClick={onPublish}
              disabled={!isValid || saving || publishing || status === 'pending_review'}
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={conflict} onOpenChange={setConflict}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>This section changed elsewhere</DialogTitle>
            <DialogDescription>
              Someone else (or another tab) updated this section. Reload the server copy to continue
              editing safely. Unsaved changes here will be discarded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => window.location.reload()}>Reload server copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
