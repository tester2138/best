import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getSessionContext } from '@/lib/guards'
import { resolveActiveBrand } from '@/lib/portal/active-brand'
import { query } from '@/lib/portal/db'
import { SECTION_LIST } from '@/lib/content/registry'
import { StatusChip } from '../status-chip'

export const metadata: Metadata = { title: 'Edit content' }
export const dynamic = 'force-dynamic'

interface Row {
  section_key: string
  status: string
}

export default async function EditIndexPage() {
  const ctx = await getSessionContext()
  const active = ctx ? await resolveActiveBrand(ctx.brands) : null
  if (!active) return null

  const rows = await query<Row>(
    `select section_key, status from public.broker_page_sections where brand_id = $1`,
    [active.id],
  )
  const byKey = new Map(rows.map((r) => [r.section_key, r.status]))

  return (
    <div className="mx-auto max-w-3xl">
      <header className="anim-fade-up mb-10 pt-4 text-center">
        <p className="eyebrow">Page editor</p>
        <h1 className="mt-2 text-balance text-[clamp(28px,4.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em] text-[#1D1D1F]">
          Edit content
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-[17px] leading-[1.47] text-[#86868B]">
          Twelve sections make up your public broker profile. Edit each one, then publish.
        </p>
      </header>

      <ul className="anim-fade-up anim-d-1 overflow-hidden rounded-[18px] border border-[#E8E8ED] bg-white">
        {SECTION_LIST.map((def, i) => {
          const status = byKey.get(def.key) ?? 'draft'
          return (
            <li key={def.key} className={i > 0 ? 'border-t border-[#E8E8ED]' : ''}>
              <Link
                href={`/portal/edit/${def.key}`}
                className="p-row flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-[#1D1D1F]">{def.title}</p>
                  {def.moderated && (
                    <p className="text-[13px] text-[#86868B]">Reviewed before going live</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusChip status={byKey.has(def.key) ? status : 'draft'} />
                  <ChevronRight className="p-row-chevron size-4 text-[#86868B]" strokeWidth={1.5} />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
