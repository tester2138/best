import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { getEditorialDefaults } from '@/lib/catalog'
import { SECTION_KEYS, SECTIONS, type SectionKey } from '@/lib/content/registry'
import { requireStaffBrandPage } from '@/lib/guards'
import { queryOne } from '@/lib/portal/db'
import { SectionForm } from '@/app/portal/(app)/edit/section-form'

export const dynamic = 'force-dynamic'

interface SectionRow {
  draft: Record<string, unknown> | null
  published: Record<string, unknown> | null
  status: string
  version: number
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sectionKey: string }>
}): Promise<Metadata> {
  const { sectionKey } = await params
  const section = SECTIONS[sectionKey as SectionKey]
  return { title: section ? `Edit · ${section.title}` : 'Edit brand content' }
}

export default async function AdminBrandSectionEditorPage({
  params,
}: {
  params: Promise<{ id: string; sectionKey: string }>
}) {
  const { id, sectionKey } = await params
  if (!SECTION_KEYS.includes(sectionKey as SectionKey)) notFound()

  await requireStaffBrandPage(id, 'editorial:write')
  const brand = await queryOne<{ id: string; name: string; slug: string }>(
    `select id, name, slug from public.brands where id = $1`,
    [id],
  )
  if (!brand) notFound()

  const key = sectionKey as SectionKey
  const section = SECTIONS[key]
  const row = await queryOne<SectionRow>(
    `select draft, published, status, version
       from public.broker_page_sections where brand_id = $1 and section_key = $2`,
    [brand.id, key],
  )

  let initialDraft = row?.draft ?? row?.published ?? null
  if (!initialDraft) {
    const defaults = getEditorialDefaults(brand.slug)
    initialDraft = defaults[key] ?? null
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href={`/admin/brands/${brand.id}?tab=content`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to {brand.name}
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Brand page content</p>
        <h1 className="text-2xl font-semibold tracking-tight">{section.title}</h1>
        <p className="text-sm text-muted-foreground">
          Update the content shown on {brand.name}&apos;s public broker page.
        </p>
      </header>

      {row?.status === 'pending_review' ? (
        <Card className="p-5">
          <p className="font-medium">This section is awaiting review</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It cannot be edited until the moderation review is complete.
          </p>
        </Card>
      ) : (
        <SectionForm
          brandId={brand.id}
          brandSlug={brand.slug}
          sectionKey={key}
          initialDraft={initialDraft}
          initialStatus={row?.status ?? 'draft'}
          version={row?.version ?? 0}
          canWrite
          publicUrl={`/brokers/${brand.slug}`}
          adminMode
        />
      )}
    </div>
  )
}
