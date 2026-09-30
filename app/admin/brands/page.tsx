import { query } from '@/lib/portal/db'
import { requireStaff } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { BrandsClient, type BrandRow } from './brands-client'

export const dynamic = 'force-dynamic'

export default async function AdminBrandsPage() {
  const actor = await requireStaff('brokers:read')
  const brands = await query<BrandRow>(
    `select b.id, b.slug, b.name, b.is_claimed, b.portal_access, b.portal_locked,
            b.renewal_date,
            case when $3::boolean then (
              select p.email from public.brand_members m
                join public.profiles p on p.id = m.user_id
               where m.brand_id = b.id limit 1
            ) else null end as member_email,
            (select max(published_at) from public.broker_page_sections s
              where s.brand_id = b.id) as last_publish
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
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {brands.length} brand{brands.length === 1 ? '' : 's'} in the portal
          </p>
        </div>
      </div>
      <BrandsClient brands={brands} canAssign={actor.isSuperAdmin} />
    </div>
  )
}
