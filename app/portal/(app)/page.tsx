import Link from 'next/link'
import { ExternalLink, FileText, Tag, ImageIcon, ChevronRight } from 'lucide-react'
import { getSessionContext } from '@/lib/guards'
import { resolveActiveBrand } from '@/lib/portal/active-brand'
import { query } from '@/lib/portal/db'
import { SECTION_LIST } from '@/lib/content/registry'
import { StatusChip, type SectionStatus } from './status-chip'

export const dynamic = 'force-dynamic'

interface SectionRow {
  section_key: string
  status: string
  published_at: string | null
}

function toStatus(row: SectionRow | undefined): SectionStatus {
  if (!row) return 'draft'
  if (row.status === 'pending_review') return 'review'
  if (row.status === 'synced') return 'live'
  return 'draft'
}

export default async function PortalDashboardPage() {
  const ctx = await getSessionContext()
  const active = ctx ? await resolveActiveBrand(ctx.brands) : null
  if (!active) return null

  const [sections, pending] = await Promise.all([
    query<SectionRow>(
      `select section_key, status, published_at
         from public.broker_page_sections where brand_id = $1`,
      [active.id],
    ),
    query<{ id: string; target_type: string; created_at: string }>(
      `select id, target_type, created_at from public.moderation_queue
        where brand_id = $1 and status = 'pending' order by created_at desc limit 10`,
      [active.id],
    ),
  ])

  const byKey = new Map(sections.map((s) => [s.section_key, s]))
  const liveCount = SECTION_LIST.filter((d) => toStatus(byKey.get(d.key)) === 'live').length

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-14">
      {/* Mini hero */}
      <header className="anim-fade-up pt-4 text-center">
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-2 text-balance text-[clamp(32px,5vw,48px)] font-semibold leading-[1.07] tracking-[-0.018em] text-[#1D1D1F]">
          {active.name}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-pretty text-[19px] leading-[1.4] text-[#86868B]">
          <span className="font-semibold text-[#1D1D1F]">
            {liveCount} of {SECTION_LIST.length} sections live.
          </span>{' '}
          Keep your profile fresh so traders see the full picture.
        </p>

        {/* Quick actions */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/brokers/${active.slug}`}
            target="_blank"
            className="p-btn-primary inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-[15px]"
          >
            View public page
            <ExternalLink className="size-4" strokeWidth={1.5} />
          </Link>
          <Link
            href={`/brokers/${active.slug}?preview=1`}
            target="_blank"
            className="p-btn-outline inline-flex items-center rounded-full px-6 py-3 text-[15px]"
          >
            Preview draft
          </Link>
        </div>
      </header>

      {/* Shortcut tiles */}
      <section aria-label="Shortcuts" className="p-surface -mx-2 rounded-[28px] px-6 py-6 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              href: '/portal/edit',
              icon: FileText,
              title: 'Page editor',
              desc: 'Twelve sections, edit and publish.',
              delay: 'anim-d-1',
            },
            {
              href: '/portal/offers',
              icon: Tag,
              title: 'Offers',
              desc: 'Promote a bonus or campaign.',
              delay: 'anim-d-2',
            },
            {
              href: '/portal/media',
              icon: ImageIcon,
              title: 'Media',
              desc: 'Logo and platform screenshots.',
              delay: 'anim-d-3',
            },
          ].map(({ href, icon: Icon, title, desc, delay }) => (
            <Link
              key={href}
              href={href}
              data-slot="card"
              className={`anim-scale-in ${delay} group flex flex-col gap-3 bg-white p-6`}
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-[#F5F5F7] transition-colors group-hover:bg-[#E8F1FD]">
                <Icon
                  className="size-5 text-[#1D1D1F] transition-colors group-hover:text-[#0071E3]"
                  strokeWidth={1.5}
                />
              </span>
              <div>
                <p className="text-[17px] font-semibold text-[#1D1D1F]">{title}</p>
                <p className="mt-0.5 text-[13px] leading-[1.45] text-[#6E6E73]">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Page status */}
      <section className="anim-fade-up anim-d-2">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-[24px] font-semibold tracking-[-0.008em] text-[#1D1D1F]">
            Page status
          </h2>
          <Link
            href="/portal/edit"
            className="text-[15px] text-[#0066CC] transition-colors hover:underline"
          >
            Open editor ›
          </Link>
        </div>
        <div className="overflow-hidden rounded-[18px] border border-[#E8E8ED]">
          {SECTION_LIST.map((def, i) => {
            const row = byKey.get(def.key)
            return (
              <Link
                key={def.key}
                href={`/portal/edit/${def.key}`}
                className={`p-row flex items-center justify-between gap-4 px-6 py-4 ${
                  i > 0 ? 'border-t border-[#E8E8ED]' : ''
                }`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-medium text-[#1D1D1F]">
                    {def.title}
                  </span>
                  {row?.published_at && (
                    <span className="text-[13px] text-[#86868B]">
                      Updated{' '}
                      {new Date(row.published_at).toLocaleDateString('en-US', {
                        dateStyle: 'medium',
                      })}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusChip status={toStatus(row)} />
                  <ChevronRight className="p-row-chevron size-4 text-[#86868B]" strokeWidth={1.5} />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* In review */}
      {pending.length > 0 && (
        <section className="anim-fade-up anim-d-3">
          <h2 className="mb-5 text-[24px] font-semibold tracking-[-0.008em] text-[#1D1D1F]">
            In review
          </h2>
          <div className="overflow-hidden rounded-[18px] border border-[#E8E8ED]">
            {pending.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-6 py-4 ${
                  i > 0 ? 'border-t border-[#E8E8ED]' : ''
                }`}
              >
                <span className="text-[15px] capitalize text-[#1D1D1F]">
                  {p.target_type.replace('_', ' ')}
                </span>
                <span className="text-[13px] text-[#86868B]">
                  Submitted{' '}
                  {new Date(p.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
