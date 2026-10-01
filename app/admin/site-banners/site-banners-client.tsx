'use client'

import { useState, type ChangeEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { uploadSiteBannerImage, saveSiteBanner } from '@/app/actions/admin-ads'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AD_CAMPAIGN_PLACEMENTS, type SiteBannerSettings } from '@/lib/ad-campaign-types'
import type { AdPlacementKey } from '@/lib/types'

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

const PLACEMENT_DETAILS: Record<
  AdPlacementKey,
  { label: string; description: string; dimensions: string; aspectClass: string }
> = {
  'horizontal-1': {
    label: 'Header banner 1',
    description: 'First horizontal banner in the sitewide top strip.',
    dimensions: '468 × 60',
    aspectClass: 'aspect-[468/60]',
  },
  'horizontal-2': {
    label: 'Header banner 2',
    description: 'Second horizontal banner in the sitewide top strip.',
    dimensions: '468 × 60',
    aspectClass: 'aspect-[468/60]',
  },
  'square-1': {
    label: 'Sidebar banner 1',
    description: 'Upper 300 × 250 sidebar placement.',
    dimensions: '300 × 250',
    aspectClass: 'aspect-[300/250]',
  },
  'square-2': {
    label: 'Sidebar banner 2',
    description: 'Lower 300 × 250 sidebar placement.',
    dimensions: '300 × 250',
    aspectClass: 'aspect-[300/250]',
  },
}

const EDITABLE_FIELDS = [
  'campaignName',
  'brandName',
  'imageUrl',
  'destinationUrl',
  'altText',
] as const

type EditableField = (typeof EDITABLE_FIELDS)[number]

function isPreviewableImageUrl(value: string): boolean {
  const url = value.trim()
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return true

  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.public.blob.vercel-storage.com')
    )
  } catch {
    return false
  }
}

export function SiteBannersClient({
  banners,
  dbError,
}: {
  banners: SiteBannerSettings[]
  dbError: boolean
}) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<AdPlacementKey, SiteBannerSettings>>(
    () =>
      Object.fromEntries(
        banners.map((banner) => [banner.placementKey, { ...banner }]),
      ) as Record<AdPlacementKey, SiteBannerSettings>,
  )
  const [savingPlacement, setSavingPlacement] = useState<AdPlacementKey | null>(null)
  const [uploadingPlacement, setUploadingPlacement] = useState<AdPlacementKey | null>(null)
  const isBusy = savingPlacement !== null || uploadingPlacement !== null

  function updateField(
    placementKey: AdPlacementKey,
    field: EditableField,
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [placementKey]: { ...current[placementKey], [field]: value },
    }))
  }

  function hasChanges(placementKey: AdPlacementKey): boolean {
    const original = banners.find((banner) => banner.placementKey === placementKey)
    const draft = drafts[placementKey]
    return Boolean(
      original &&
        EDITABLE_FIELDS.some((field) => original[field] !== draft[field]),
    )
  }

  async function save(placementKey: AdPlacementKey) {
    const draft = drafts[placementKey]
    setSavingPlacement(placementKey)
    try {
      const result = await saveSiteBanner({
        placementKey,
        campaignName: draft.campaignName,
        brandName: draft.brandName,
        imageUrl: draft.imageUrl,
        destinationUrl: draft.destinationUrl,
        altText: draft.altText,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Banner saved for every site placement.')
      router.refresh()
    } catch {
      toast.error('Could not save this banner. Please try again.')
    } finally {
      setSavingPlacement(null)
    }
  }

  async function upload(
    event: ChangeEvent<HTMLInputElement>,
    placementKey: AdPlacementKey,
  ) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Choose an image smaller than 4 MB.')
      input.value = ''
      return
    }

    const formData = new FormData()
    formData.set('file', file)
    formData.set('placementKey', placementKey)
    setUploadingPlacement(placementKey)
    try {
      const result = await uploadSiteBannerImage(formData)
      if (!result.ok || !result.data) {
        toast.error(result.ok ? 'The upload did not return an image URL.' : result.error)
        return
      }
      updateField(placementKey, 'imageUrl', result.data.url)
      toast.success('Banner image uploaded. Save the placement to publish it.')
    } catch {
      toast.error('Could not upload this image. Please try again.')
    } finally {
      input.value = ''
      setUploadingPlacement(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Sitewide banners</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Update the four fixed banner placements used across the homepage, broker directory,
          broker profiles, offers, and news. Existing artwork remains in place until you save a
          replacement.
        </p>
      </header>

      {dbError ? (
        <Alert variant="destructive">
          <AlertTitle>Banner storage is not available</AlertTitle>
          <AlertDescription>
            The current banner images are still shown on the public site. Apply the ad campaign
            database migration before saving changes here.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {AD_CAMPAIGN_PLACEMENTS.map((placementKey) => {
          const details = PLACEMENT_DETAILS[placementKey]
          const draft = drafts[placementKey]
          const changed = hasChanges(placementKey)
          const imageCanPreview = isPreviewableImageUrl(draft.imageUrl)

          return (
            <Card key={placementKey} className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle>{details.label}</CardTitle>
                    <CardDescription>
                      {details.description} Recommended size: {details.dimensions}.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Fallback creative</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div
                  className={`relative w-full overflow-hidden rounded-lg border border-border bg-muted ${details.aspectClass}`}
                >
                  {imageCanPreview ? (
                    <Image
                      src={draft.imageUrl}
                      alt={`${draft.campaignName || details.label} preview`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 45vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                      Enter a site path or managed Blob image URL to preview the banner.
                    </div>
                  )}
                </div>

                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor={`${placementKey}-campaign-name`}>Banner name</FieldLabel>
                    <Input
                      id={`${placementKey}-campaign-name`}
                      value={draft.campaignName}
                      onChange={(event) =>
                        updateField(placementKey, 'campaignName', event.target.value)
                      }
                      maxLength={200}
                      disabled={dbError || isBusy}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${placementKey}-brand-name`}>Advertiser / brand</FieldLabel>
                    <Input
                      id={`${placementKey}-brand-name`}
                      value={draft.brandName}
                      onChange={(event) =>
                        updateField(placementKey, 'brandName', event.target.value)
                      }
                      maxLength={200}
                      disabled={dbError || isBusy}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${placementKey}-image-url`}>Image URL</FieldLabel>
                    <Input
                      id={`${placementKey}-image-url`}
                      value={draft.imageUrl}
                      onChange={(event) =>
                        updateField(placementKey, 'imageUrl', event.target.value)
                      }
                      placeholder="/ads/banner.jpg or a managed Blob URL"
                      maxLength={2048}
                      disabled={dbError || isBusy}
                      required
                    />
                    <FieldDescription>
                      Use an existing site asset or upload a replacement below.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${placementKey}-upload`}>Upload replacement artwork</FieldLabel>
                    <Input
                      id={`${placementKey}-upload`}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => void upload(event, placementKey)}
                      disabled={dbError || isBusy}
                    />
                    <FieldDescription>
                      PNG, JPEG, or WebP up to 4 MB. Uploads are optimized to WebP; the public
                      banner changes only after you save.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${placementKey}-destination`}>Click-through URL</FieldLabel>
                    <Input
                      id={`${placementKey}-destination`}
                      value={draft.destinationUrl}
                      onChange={(event) =>
                        updateField(placementKey, 'destinationUrl', event.target.value)
                      }
                      placeholder="/media-kit or https://example.com"
                      maxLength={2048}
                      disabled={dbError || isBusy}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${placementKey}-alt-text`}>Accessible alt text</FieldLabel>
                    <Input
                      id={`${placementKey}-alt-text`}
                      value={draft.altText}
                      onChange={(event) =>
                        updateField(placementKey, 'altText', event.target.value)
                      }
                      maxLength={300}
                      disabled={dbError || isBusy}
                      required
                    />
                  </Field>
                </FieldGroup>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">
                    {changed ? 'Unsaved changes' : 'Current saved banner'}
                  </p>
                  <Button
                    type="button"
                    onClick={() => void save(placementKey)}
                    disabled={dbError || isBusy || !changed}
                    aria-busy={savingPlacement === placementKey}
                  >
                    {savingPlacement === placementKey ? 'Saving…' : 'Save banner'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
