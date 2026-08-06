import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionContext } from '@/lib/guards'
import { resolveActiveBrand } from '@/lib/portal/active-brand'
import { query } from '@/lib/portal/db'
import { SECTIONS, SECTION_KEYS, type SectionKey } from '@/lib/content/registry'
import { getEditorialDefaults } from '@/lib/catalog'
import { SectionForm } from '../section-form'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sectionKey: string }>
}): Promise<Metadata> {
  const { sectionKey } = await params
  const def = SECTIONS[sectionKey as SectionKey]
  return { title: def ? `Edit · ${def.title}` : 'Edit content' }
}

interface SectionRow {
  draft: Record<string, unknown> | null
  published: Record<string, unknown> | null
  status: string
  version: number
}

export default async function SectionEditorPage({
  params,
}: {
  params: Promise<{ sectionKey: string }>
}) {
  const { sectionKey } = await params
  if (!SECTION_KEYS.includes(sectionKey as SectionKey)) notFound()
  const key = sectionKey as SectionKey
  const def = SECTIONS[key]

  const ctx = await getSessionContext()
  const active = ctx ? await resolveActiveBrand(ctx.brands) : null
  if (!active) return null

  const canWrite =
    ctx!.profile.role === 'admin' ||
    (active.portal_access !== 'paused' && !active.portal_locked)

  const rows = await query<SectionRow>(
    `select draft, published, status, version
       from public.broker_page_sections where brand_id = $1 and section_key = $2`,
    [active.id, key],
  )
  const row = rows[0]

  // First edit ever: seed the form from editorial defaults so the broker starts
  // from their existing public content, not a blank slate.
  let initialDraft = row?.draft ?? row?.published ?? null
  if (!initialDraft) {
    const defaults = getEditorialDefaults(active.slug)
    initialDraft = defaults[key] ?? null
  }

  const publicUrl = `/brokers/${active.slug}`

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/business/edit"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All sections
        </Link>
      </div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{def.title}</h1>
        {def.moderated && (
          <p className="mt-1 text-sm text-muted-foreground">
            Changes to this section are reviewed by our team before going live.
          </p>
        )}
      </header>

      <SectionForm
        brandId={active.id}
        brandSlug={active.slug}
        sectionKey={key}
        initialDraft={initialDraft}
        initialStatus={row?.status ?? 'draft'}
        version={row?.version ?? 0}
        canWrite={canWrite}
        publicUrl={publicUrl}
      />
    </div>
  )
}
