'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Upload, Trash2, ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { uploadMedia, deleteMedia, updateMediaAlt } from '@/app/actions/media'
import type { MediaAsset } from '@/types/portal'

const MAX_SCREENSHOTS = 8

export function MediaManager({
  brandId,
  canWrite,
  initialLogo,
  initialScreenshots,
}: {
  brandId: string
  canWrite: boolean
  initialLogo: MediaAsset | null
  initialScreenshots: MediaAsset[]
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState<'logo' | 'screenshot' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<MediaAsset | null>(null)
  const [pending, startTransition] = useTransition()
  const logoInput = useRef<HTMLInputElement>(null)
  const shotInput = useRef<HTMLInputElement>(null)
  const [shotAlt, setShotAlt] = useState('')

  async function doUpload(kind: 'logo' | 'screenshot', file: File, alt?: string) {
    setUploading(kind)
    const fd = new FormData()
    fd.set('brandId', brandId)
    fd.set('kind', kind)
    if (alt) fd.set('alt', alt)
    fd.set('file', file)
    const res = await uploadMedia(fd)
    setUploading(null)
    if (res.ok) {
      toast.success(kind === 'logo' ? 'Logo updated' : 'Screenshot added')
      setShotAlt('')
      router.refresh()
    } else {
      toast.error(res.error ?? 'Upload failed')
    }
  }

  function onDelete(asset: MediaAsset) {
    startTransition(async () => {
      const res = await deleteMedia({ brandId, assetId: asset.id })
      if (res.ok) {
        toast.success('Removed')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Could not remove')
      }
      setConfirmDelete(null)
    })
  }

  function saveAlt(asset: MediaAsset, value: string) {
    if (value === (asset.alt_text ?? '')) return
    startTransition(async () => {
      const res = await updateMediaAlt({ brandId, assetId: asset.id, alt: value })
      if (res.ok) toast.success('Alt text saved')
      else toast.error(res.error ?? 'Could not save alt text')
    })
  }

  const canAddScreenshot = canWrite && initialScreenshots.length < MAX_SCREENSHOTS

  return (
    <div className="space-y-10">
      {/* Logo */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Logo</h2>
        <div className="flex items-center gap-5 rounded-[20px] border border-[#E8E8ED] p-6">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E8E8ED] bg-muted">
            {initialLogo ? (
              <Image
                src={initialLogo.public_url || '/placeholder.svg'}
                alt={initialLogo.alt_text ?? 'Brand logo'}
                width={96}
                height={96}
                className="size-full object-contain"
              />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              Square PNG, JPG or WebP. 256–1024px per side, under 1&nbsp;MB.
            </p>
            {canWrite && (
              <div className="mt-3">
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void doUpload('logo', f)
                    e.target.value = ''
                  }}
                />
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={uploading === 'logo'}
                  onClick={() => logoInput.current?.click()}
                >
                  {uploading === 'logo' ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-4 w-4" />
                  )}
                  {initialLogo ? 'Replace logo' : 'Upload logo'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Screenshots{' '}
            <span className="font-normal text-muted-foreground">
              ({initialScreenshots.length}/{MAX_SCREENSHOTS})
            </span>
          </h2>
        </div>

        {initialScreenshots.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#E8E8ED] p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No screenshots yet. Add platform or app images (min 800×450).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {initialScreenshots.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-2xl border border-[#E8E8ED]">
                <div className="relative aspect-video bg-muted">
                  <Image
                    src={s.public_url || '/placeholder.svg'}
                    alt={s.alt_text ?? 'Screenshot'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <div className="flex items-end gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <Label className="text-xs text-muted-foreground">Alt text</Label>
                    <Input
                      defaultValue={s.alt_text ?? ''}
                      disabled={!canWrite || pending}
                      maxLength={140}
                      className="mt-1 h-8"
                      onBlur={(e) => canWrite && saveAlt(s, e.target.value.trim())}
                    />
                  </div>
                  {canWrite && (
                    <button
                      type="button"
                      aria-label="Delete screenshot"
                      title="Delete"
                      onClick={() => setConfirmDelete(s)}
                      disabled={pending}
                      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canAddScreenshot && (
          <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-[#E8E8ED] p-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Label htmlFor="shot-alt" className="text-xs text-muted-foreground">
                Alt text (required)
              </Label>
              <Input
                id="shot-alt"
                value={shotAlt}
                onChange={(e) => setShotAlt(e.target.value)}
                maxLength={140}
                placeholder="e.g. MT5 desktop platform order ticket"
                className="mt-1"
              />
            </div>
            <input
              ref={shotInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void doUpload('screenshot', f, shotAlt.trim())
                e.target.value = ''
              }}
            />
            <Button
              className="rounded-full bg-[#0066CC] text-white hover:bg-[#0066CC]/90"
              disabled={uploading === 'screenshot' || shotAlt.trim().length === 0}
              onClick={() => shotInput.current?.click()}
            >
              {uploading === 'screenshot' ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}
              Add screenshot
            </Button>
          </div>
        )}
      </section>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this image?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the image from your profile and storage. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && onDelete(confirmDelete)}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
