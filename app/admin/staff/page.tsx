import { query, queryOne } from '@/lib/portal/db'
import { isConfiguredFullAccessAdmin, requireAdminRolePage } from '@/lib/guards'
import { roleHasFullAccess, type StaffRole } from '@/lib/staff-permissions'
import { AdminUsersClient, type AdminAccessUser } from '@/components/admin/admin-users-client'
import { StaffClient, type StaffMember } from './staff-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admins & staff access · BestForex Portal', robots: { index: false, follow: false } }

type AssignedStaffRole = Exclude<StaffRole, 'super_admin' | 'admin' | 'merchant'>
interface RawStaff extends StaffMember { scopes: string[]; scope_brand_ids: string[] }
interface RawAdminAccessUser {
  user_id: string
  email: string
  full_name: string | null
  profile_role: 'admin' | 'brand_user'
  staff_role: AssignedStaffRole | null
}
interface BrandOption { id: string; name: string }
interface Invitation { id: string; email: string; role: StaffMember['role']; scope_mode: 'all' | 'selected'; status: string; expires_at: string }

const STAFF_ROLE_LABELS: Record<AssignedStaffRole, string> = {
  viewer: 'Read-only viewer',
  editor_publisher: 'Editor / publisher',
  commercial_manager: 'Commercial manager',
  support_reviewer: 'Support / reviewer',
  analyst: 'Analyst',
}

export default async function StaffPage() {
  const actor = await requireAdminRolePage()
  const accessRows = await query<RawAdminAccessUser>(
    `select p.id as user_id, lower(p.email) as email, p.full_name, p.role as profile_role,
            sa.role as staff_role
       from public.profiles p
       left join public.staff_access sa on sa.user_id = p.id and sa.status = 'active'
      where p.role = 'admin'
         or (
           sa.user_id is not null
           and not exists (
             select 1 from public.staff_invitations i
              where lower(i.email) = lower(p.email)
                and i.status in ('pending', 'expired')
                and i.expires_at <= now()
           )
         )
      order by p.full_name nulls last, lower(p.email)`,
  )
  const admins: AdminAccessUser[] = accessRows.map((user) => {
    const isProfileAdmin = user.profile_role === 'admin'
    const isFullAccess = isConfiguredFullAccessAdmin(user.email) ||
      (user.staff_role !== null && roleHasFullAccess(user.staff_role))
    const accessLabel = isProfileAdmin
      ? isFullAccess ? 'Full access' : 'Admin'
      : `${user.staff_role ? STAFF_ROLE_LABELS[user.staff_role] : 'Staff'}${user.staff_role && roleHasFullAccess(user.staff_role) ? ' · Full access' : ''}`

    return {
      id: user.user_id,
      email: user.email,
      fullName: user.full_name,
      accessLabel,
      isFullAccess,
      canRemove:
        isProfileAdmin &&
        user.user_id !== actor.id &&
        (!isFullAccess || actor.hasFullAccess),
    }
  })

  if (!actor.hasFullAccess) {
    return <AdminUsersClient admins={admins} showPageHeading />
  }

  const [staff, brands, invitations, settings, selectableBrands] = await Promise.all([
    query<RawStaff>(
      `select p.id as user_id, p.email, p.full_name, sa.role, sa.status, sa.scope_mode,
              coalesce(array_agg(b.name order by b.name) filter (where b.id is not null), '{}') as scopes,
              coalesce(array_agg(sc.brand_id::text order by b.name) filter (where sc.brand_id is not null), '{}') as scope_brand_ids
         from public.staff_access sa join public.profiles p on p.id = sa.user_id
         left join public.staff_brand_scopes sc on sc.user_id = p.id
         left join public.brands b on b.id = sc.brand_id
        group by p.id, sa.user_id, sa.role, sa.status, sa.scope_mode
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
    queryOne<{ invitation_ttl_days: number }>(
      `select invitation_ttl_days from public.portal_settings where id = true`,
    ),
    queryOne<{ count: string }>(`select count(*)::text as count from public.brands`),
  ])

  return (
    <div className="flex flex-col gap-8">
      <StaffClient
        staff={staff}
        brands={brands}
        invitations={invitations}
        totalBrands={Number(selectableBrands?.count ?? 0)}
        invitationTtlDays={settings?.invitation_ttl_days ?? 7}
      />
      <AdminUsersClient admins={admins} />
    </div>
  )
}
