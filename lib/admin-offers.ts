import 'server-only'
import { query } from '@/lib/portal/db'
import type { AdminOfferRecord } from '@/lib/admin-offer-types'
import type { StaffActor } from '@/lib/guards'

const ADMIN_OFFER_SELECT = `
  select id,
         broker_id as "brokerId",
         broker_name as "brokerName",
         broker_logo as "brokerLogo",
         title,
         description,
         value,
         code,
         type,
         terms,
         affiliate_url as "affiliateUrl",
         is_featured as "isFeatured",
         is_exclusive as "isExclusive",
         starts_at as "startsAt",
         ends_at as "endsAt",
         status,
         sort_order as "sortOrder",
         created_at as "createdAt"
    from public.admin_offers
`

export async function listAdminOffers(actor: StaffActor): Promise<AdminOfferRecord[]> {
  return query<AdminOfferRecord>(
    `${ADMIN_OFFER_SELECT}
      where ($1::boolean
        or exists (
          select 1 from public.staff_access sa
           where sa.user_id = $2 and sa.status = 'active' and sa.scope_mode = 'all'
        )
        or exists (
          select 1 from public.brands b
          join public.staff_brand_scopes sc on sc.brand_id = b.id
           where b.slug = admin_offers.broker_id and sc.user_id = $2
        ))
      order by sort_order asc, created_at desc`,
    [actor.isSuperAdmin, actor.id],
  )
}
