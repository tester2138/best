import { notFound } from 'next/navigation'
import Link from 'next/link'
import { query, queryOne } from '@/lib/portal/db'
import { requireStaffBrand } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { SECTION_LIST } from '@/lib/content/registry'
import { brokers as editorialBrokers } from '@/data/brokers'
import { directoryCompanies as editorialDirectory } from '@/data/directory'
import { applyOverrides } from '@/lib/admin-overrides'
import { getPublicBrokerBaseBySlug, getPublicCompanyBaseBySlug } from '@/lib/public-brokers'
import type { Brand } from '@/types/portal'
import type { ProfileEditorProps } from './profile/profile-client'
import { BrandDetailClient, type MemberInfo, type SectionStatusRow } from './brand-detail-client'

export const dynamic = 'force-dynamic'

interface AdminBrandRow extends Brand {
  is_duplicate: boolean
  needs_manual_review: boolean
  display_rank: number | null
  brand_category: string | null
  brand_status: string | null
  regulator_tier: string | null
  internal_priority: string | null
  internal_notes: string | null
}

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
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams])
  const actor = await requireStaffBrand(id, 'brokers:read')
  const canManage = roleHasPermission(actor.role, 'brokers:manage')

  const brand = await queryOne<AdminBrandRow>(`select * from public.brands where id = $1`, [id])
  if (!brand) notFound()

  const slug = brand.slug.toLowerCase()
  const directoryHit = editorialDirectory.find((company) => company.slug.toLowerCase() === slug)
  const brokerHit = directoryHit
    ? undefined
    : editorialBrokers.find((broker) => broker.slug.toLowerCase() === slug)
  const catalogCompany: Record<string, unknown> | undefined = directoryHit ?? brokerHit

  const [member, invitation, sections, activity, publicBase, overrideRow] = await Promise.all([
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
    directoryHit
      ? getPublicCompanyBaseBySlug(slug)
      : getPublicBrokerBaseBySlug(slug),
    queryOne<{ overrides: Record<string, unknown>; updated_at: string }>(
      `select overrides, updated_at from public.admin_profile_overrides where slug = $1`,
      [slug],
    ),
  ])

  const profileBase = (publicBase ?? catalogCompany ?? {}) as Record<string, unknown>
  const profileValues = applyOverrides(profileBase, overrideRow?.overrides) as Record<string, unknown>
  const profile: ProfileEditorProps | null = catalogCompany
    ? {
        slug,
        displayName: (profileValues.name as string) ?? brand.name,
        hasPortalRecord: true,
        base: profileBase,
        values: profileValues,
        overridesUpdatedAt: overrideRow?.updated_at ?? null,
        placement: {
          name: brand.name,
          verification_status: brand.verification_status,
          is_sponsored: brand.is_sponsored,
          is_featured: brand.is_featured,
          is_duplicate: brand.is_duplicate,
          needs_manual_review: brand.needs_manual_review,
          display_rank: brand.display_rank,
          brand_category: brand.brand_category,
          brand_status: brand.brand_status,
          regulator_tier: brand.regulator_tier,
          internal_priority: brand.internal_priority,
          internal_notes: brand.internal_notes,
        },
        canManageProfile: roleHasPermission(actor.role, 'editorial:write'),
        canManagePlacement: canManage,
      }
    : null

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
        canEditContent={roleHasPermission(actor.role, 'editorial:write')}
        initialTab={tab === 'content' ? 'content' : 'overview'}
        profile={profile}
      />
    </div>
  )
}
