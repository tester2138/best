import { notFound } from 'next/navigation'
import Link from 'next/link'
import { query, queryOne } from '@/lib/portal/db'
import { requireStaffBrand } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { SECTION_LIST } from '@/lib/content/registry'
import type { Brand } from '@/types/portal'
import { BrandDetailClient, type MemberInfo, type SectionStatusRow } from './brand-detail-client'

export const dynamic = 'force-dynamic'

interface AuditRow {
  id: string
  actor_email: string | null
  action: string
  target: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

export default async function AdminBrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const actor = await requireStaffBrand(id, 'brokers:read')
  const canManage = roleHasPermission(actor.role, 'brokers:manage')

  const brand = await queryOne<Brand>(`select * from public.brands where id = $1`, [id])
  if (!brand) notFound()
  const canEditEditorial = roleHasPermission(actor.role, 'editorial:write')

  const [member, invitation, sections, activity] = await Promise.all([
    canManage || actor.isSuperAdmin ? queryOne<MemberInfo>(
      `select m.user_id, p.email, p.full_name, p.must_change_password
         from public.brand_members m
         join public.profiles p on p.id = m.user_id
        where m.brand_id = $1
        limit 1`,
      [id],
    ) : Promise.resolve(null),
    canManage || actor.isSuperAdmin ? queryOne<{
      id: string
      status: string
      resend_count: number
      expires_at: string
      last_sent_at: string | null
    }>(
      `select id, status, resend_count, expires_at, last_sent_at
         from public.invitations
        where brand_id = $1
        order by created_at desc
        limit 1`,
      [id],
    ) : Promise.resolve(null),
    query<{ section_key: string; status: string; published_at: string | null }>(
      `select section_key, status, published_at
         from public.broker_page_sections where brand_id = $1`,
      [id],
    ),
    query<AuditRow>(
      `select id, actor_email, action, target, meta, created_at
         from public.audit_log where brand_id = $1
        order by created_at desc limit 100`,
      [id],
    ),
  ])

  const sectionMap = new Map(sections.map((s) => [s.section_key, s]))
  const sectionStatus: SectionStatusRow[] = SECTION_LIST.map((def) => {
    const row = sectionMap.get(def.key)
    return {
      key: def.key,
      label: def.title,
      status: row?.status ?? 'empty',
      publishedAt: row?.published_at ?? null,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/brands" className="hover:text-foreground">
          Brands
        </Link>
        <span>/</span>
        <span className="text-foreground">{brand.name}</span>
      </div>

      <BrandDetailClient
        brand={brand}
        member={member}
        invitation={invitation}
        sections={sectionStatus}
        activity={activity}
        canManage={canManage}
        canEditEditorial={canEditEditorial}
      />
    </div>
  )
}
