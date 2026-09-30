import { directoryCompanies } from '@/data/directory'
import { brokers } from '@/data/brokers'
import { query } from '@/lib/portal/db'
import { hasGlobalStaffScope, requireStaff } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { BrandsClient, type BrandRow } from './brands-client'

export const dynamic = 'force-dynamic'

const catalogBySlug = new Map<string, { name: string }>()
for (const company of directoryCompanies) {
  if (!catalogBySlug.has(company.slug)) catalogBySlug.set(company.slug, { name: company.name })
}
for (const broker of brokers) {
  if (!catalogBySlug.has(broker.slug)) catalogBySlug.set(broker.slug, { name: broker.name })
}

export default async function AdminBrandsPage() {
  const actor = await requireStaff('brokers:read')
  const [databaseBrands, globalScope] = await Promise.all([
    query<BrandRow>(
      `select b.id, b.slug, b.name, b.is_claimed, b.portal_access, b.portal_locked,
              b.renewal_date, b.verification_status, b.is_sponsored, b.is_featured,
              b.display_rank, b.rating_score, b.is_duplicate,
              case when $3::boolean then (
                select p.email from public.brand_members m
                  join public.profiles p on p.id = m.user_id
                 where m.brand_id = b.id limit 1
              ) else null end as member_email,
              (select max(published_at) from public.broker_page_sections s
                where s.brand_id = b.id) as last_publish,
              true as has_database_record
         from public.brands b
        where ($2::boolean or exists (
          select 1 from public.staff_access sa
           where sa.user_id = $1 and sa.status = 'active' and sa.scope_mode = 'all'
        ) or exists (
          select 1 from public.staff_brand_scopes sc
           where sc.user_id = $1 and sc.brand_id = b.id
        ))
        order by b.claimed_at desc nulls last, b.name asc`,
      [actor.id, actor.isSuperAdmin, roleHasPermission(actor.role, 'brokers:manage')],
    ),
    hasGlobalStaffScope(actor),
  ])

  const visibleSlugs = new Set(databaseBrands.map((brand) => brand.slug))
  const catalogOnly: BrandRow[] = globalScope
    ? [...catalogBySlug.entries()]
        .filter(([slug]) => !visibleSlugs.has(slug))
        .map(([slug, company]) => ({
          id: slug,
          slug,
          name: company.name,
          is_claimed: false,
          portal_access: 'active',
          portal_locked: false,
          renewal_date: null,
          member_email: null,
          last_publish: null,
          verification_status: 'unverified',
          is_sponsored: false,
          is_featured: false,
          display_rank: null,
          rating_score: null,
          is_duplicate: false,
          has_database_record: false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : []

  const brands = [...databaseBrands, ...catalogOnly].map((brand) => ({
    ...brand,
    profile_href: brand.has_database_record
      ? `/admin/brands/${brand.id}/profile`
      : `/admin/brands/${brand.slug}/profile`,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Broker directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {brands.length.toLocaleString()} broker profiles, including catalog entries not yet provisioned in the portal.
        </p>
      </div>
      <BrandsClient brands={brands} canAssign={actor.isSuperAdmin} />
    </div>
  )
}

