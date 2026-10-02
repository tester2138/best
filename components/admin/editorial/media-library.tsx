'use client'

import { useMemo, useState, useTransition, type ChangeEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, ExternalLink } from 'lucide-react'
import { uploadEditorialImage } from '@/app/actions/admin-editorial'
import type { AdminEditorialMedia } from '@/lib/admin-editorial'
import { buildAdminEditorialMediaUrl } from '@/lib/editorial-media'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export interface EditorialMediaAsset extends AdminEditorialMedia {
  usedBy: { label: string; href: string }[]
}

function formatBytes(value: number): string {
  if (value < 1_000_000) return `${Math.max(1, Math.round(value / 1_000))} KB`
  return `${(value / 1_000_000).toFixed(1)} MB`
}

export function MediaLibrary({
  assets,
  canWrite,
}: {
  assets: EditorialMediaAsset[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return normalized ? assets.filter((asset) => asset.pathname.toLowerCase().includes(normalized)) : assets
  }, [assets, query])

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.set('file', file)
    startTransition(async () => {
      const result = await uploadEditorialImage(formData)
      if (!result.ok || !result.data) {
        toast.error(result.ok ? 'The upload did not return a URL.' : result.error)
        input.value = ''
        return
      }
      setUploadedUrl(result.data.url)
      toast.success('Image uploaded and optimized.')
      input.value = ''
      router.refresh()
    })
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Image URL copied.')
    } catch {
      toast.error('Clipboard access is unavailable in this browser.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload an image</CardTitle>
            <CardDescription>Images are checked, rotated from metadata, resized and stored as WebP. Existing asset URLs are never changed.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="editorial-media-upload">Choose an image</FieldLabel>
              <Input id="editorial-media-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} disabled={isPending} />
              <FieldDescription>PNG, JPEG or WebP; maximum 10 MB.</FieldDescription>
            </Field>
            {isPending ? <p role="status" className="text-sm text-muted-foreground">Uploading and optimizing image…</p> : null}
            {uploadedUrl ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <span className="min-w-0 flex-1 break-all text-sm text-muted-foreground">{uploadedUrl}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => copyUrl(uploadedUrl)}><Copy data-icon="inline-start" />Copy URL</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{filteredAssets.length.toLocaleString()} images shown from the project Blob store.</p>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by filename or path" aria-label="Filter media by path" className="sm:max-w-sm" />
      </div>

      {filteredAssets.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No images found in the editorial library.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAssets.map((asset) => (
            <Card key={asset.pathname} className="overflow-hidden">
              <div className="relative aspect-video border-b border-border bg-muted">
                <Image src={buildAdminEditorialMediaUrl(asset.pathname)} alt={`Editorial media ${asset.pathname.split('/').pop()}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-contain" unoptimized />
              </div>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-all text-sm font-medium">{asset.pathname}</p>
                  <Badge variant="outline">{formatBytes(asset.size)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Uploaded {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(asset.uploadedAt))}</p>
                {asset.usedBy.length ? (
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span>Used by</span>
                    {asset.usedBy.slice(0, 2).map((usage) => <Link key={`${usage.href}:${usage.label}`} href={usage.href} className="truncate text-primary hover:underline">{usage.label}</Link>)}
                    {asset.usedBy.length > 2 ? <span>and {asset.usedBy.length - 2} more</span> : null}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Not currently referenced by a managed profile or page.</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => copyUrl(asset.url)}><Copy data-icon="inline-start" />Copy URL</Button>
                  <Button asChild size="sm" variant="ghost"><a href={buildAdminEditorialMediaUrl(asset.pathname)} target="_blank" rel="noopener noreferrer">Open <ExternalLink data-icon="inline-end" /></a></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
