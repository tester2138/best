import 'server-only'
import { query } from '@/lib/portal/db'
import {
  offers as staticOffers,
  getFeaturedOffers as staticFeaturedOffers,
  getOffersByBroker as staticOffersByBroker,
} from '@/data/offers'
import type { Offer } from '@/lib/types'

/**
 * Public offer delivery.
 *
 * Offers live in `public.admin_offers` so staff can manage them without a
 * deploy. Every read falls back to the static archive in `data/offers.ts`
 * when the database is unavailable (missing table, Neon quota, outage), so
 * public pages always render.
 */

interface OfferRow {
  id: string
  brokerId: string
  brokerName: string
  brokerLogo: string | null
  title: string
  description: string
  value: string
  code: string | null
  type: Offer['type']
  terms: string
  affiliateUrl: string
  isFeatured: boolean
  isExclusive: boolean
  startsAt: string | null
  endsAt: string | null
  status: 'draft' | 'active' | 'paused' | 'archived'
  sortOrder: number
}

const OFFER_SELECT = `
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
         sort_order as "sortOrder"
    from public.admin_offers
`

function isInWindow(row: OfferRow): boolean {
  const now = Date.now()
  if (row.startsAt && new Date(row.startsAt).getTime() > now) return false
  if (row.endsAt && new Date(row.endsAt).getTime() < now) return false
  return true
}

function toOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    brokerId: row.brokerId,
    brokerName: row.brokerName,
    brokerLogo: row.brokerLogo ?? '',
    title: row.title,
    description: row.description,
    value: row.value,
    code: row.code ?? undefined,
    type: row.type,
    terms: row.terms,
    affiliateUrl: row.affiliateUrl,
    isFeatured: row.isFeatured,
    isExclusive: row.isExclusive,
    expiresAt: row.endsAt ?? undefined,
  }
}

async function fetchPublicOffers(brokerId?: string): Promise<{
  ok: boolean
  offers: Offer[]
}> {
  try {
    const rows =
      brokerId === undefined
        ? await query<OfferRow>(
            `${OFFER_SELECT} where status = 'active' order by sort_order asc, created_at asc`,
          )
        : await query<OfferRow>(
            `${OFFER_SELECT} where status = 'active' and broker_id = $1 order by sort_order asc, created_at asc`,
            [brokerId],
          )
    return { ok: true, offers: rows.filter(isInWindow).map(toOffer) }
  } catch (err) {
    console.warn('[v0] admin offers lookup failed, using static offers:', err)
    return { ok: false, offers: [] }
  }
}

/** All live offers. Falls back to the static archive on database failure. */
export async function getPublicOffers(): Promise<Offer[]> {
  const { ok, offers } = await fetchPublicOffers()
  return ok ? offers : staticOffers
}

/** Live featured offers (homepage strip). Static fallback on failure. */
export async function getPublicFeaturedOffers(): Promise<Offer[]> {
  const { ok, offers } = await fetchPublicOffers()
  return ok ? offers.filter((o) => o.isFeatured) : staticFeaturedOffers()
}

/** Live offers for one broker profile. Static fallback on failure. */
export async function getPublicOffersByBroker(brokerId: string): Promise<Offer[]> {
  const { ok, offers } = await fetchPublicOffers(brokerId)
  return ok ? offers : staticOffersByBroker(brokerId)
}
