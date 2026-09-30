import { query, queryOne } from '@/lib/portal/db'
import { requireStaff } from '@/lib/guards'
import { StaffClient, type StaffMember } from './staff-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Staff & access · BestForex Portal', robots: { index: false, follow: false } }

interface RawStaff extends StaffMember { scopes: string[]; scope_brand_ids: string[] }
interface BrandOption { id: string; name: string }
interface Invitation { id: string; email: string; role: StaffMember['role']; scope_mode: 'all' | 'selected'; status: string; expires_at: string }

export default async function StaffPage() {
  await requireStaff('staff:manage')
  const [staff, brands, invitations] = await Promise.all([
    query<RawStaff>(
      `select p.id as user_id, p.email, p.full_name, sa.role, sa.status, sa.scope_mode,
              coalesce(array_agg(b.name order by b.name) filter (where b.id is not null), '{}') as scopes,
              coalesce(array_agg(sc.brand_id::text order by b.name) filter (where sc.brand_id is not null), '{}') as scope_brand_ids,
              coalesce(u."twoFactorEnabled", false) as mfa_enabled
         from public.staff_access sa join public.profiles p on p.id = sa.user_id
         left join public.staff_brand_scopes sc on sc.user_id = sa.user_id
         left join public.brands b on b.id = sc.brand_id
         left join public."user" u on u.id = p.id
        group by p.id, sa.user_id, sa.role, sa.status, sa.scope_mode, u."twoFactorEnabled"
        order by p.full_name nulls last, p.email`,
    ),
    query<BrandOption>(`select id, name from public.brands order by name`),
    query<Invitation>(
      `select id, email, role, scope_mode,
              case when status = 'pending' and expires_at <= now() then 'expired' else status end as status,
              expires_at
         from public.staff_invitations
        where status in ('pending', 'expired') order by created_at desc limit 100`,
    ),
  ])
  const selectableBrands = await queryOne<{ count: string }>(`select count(*)::text as count from public.brands`)
  return <StaffClient staff={staff} brands={brands} invitations={invitations} totalBrands={Number(selectableBrands?.count ?? 0)} />
}
