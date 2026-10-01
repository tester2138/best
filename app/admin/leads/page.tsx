import { query } from '@/lib/portal/db'
import { requireStaff } from '@/lib/guards'
import { LeadsClient, type Lead } from './leads-client'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Claim leads · BestForex Portal',
  robots: { index: false, follow: false },
}

interface Row {
  id: string
  full_name: string
  work_email: string
  message: string | null
  status: 'new' | 'contacted' | 'converted' | 'rejected'
  created_at: string
  brand_id: string | null
  brand_name: string | null
  brand_slug: string | null
}

export default async function LeadsPage() {
  const actor = await requireStaff('leads:read')
  const rows = await query<Row>(
    `select c.id, c.full_name, c.work_email, c.message, c.status, c.created_at,
            c.brand_id, b.name as brand_name, b.slug as brand_slug
       from public.claim_requests c
       left join public.brands b on b.id = c.brand_id
      where ($2::boolean or exists (
        select 1 from public.staff_access sa
         where sa.user_id = $1 and sa.status = 'active' and sa.scope_mode = 'all'
      ) or exists (
        select 1 from public.staff_brand_scopes sc
         where sc.user_id = $1 and sc.brand_id = c.brand_id
      ))
      order by
        case c.status when 'new' then 0 when 'contacted' then 1 when 'converted' then 2 else 3 end,
        c.created_at desc`,
    [actor.id, actor.isSuperAdmin],
  )

  const leads: Lead[] = rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    workEmail: r.work_email,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
    brandName: r.brand_name,
    brandSlug: r.brand_slug,
  }))

  const newCount = leads.filter((l) => l.status === 'new').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Claim leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {leads.length === 0
            ? 'No claim requests yet.'
            : `${newCount} new · ${leads.length} total`}
        </p>
      </div>
      <LeadsClient leads={leads} canAssign={actor.isSuperAdmin} />
    </div>
  )
}
