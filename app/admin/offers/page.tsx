import { requireStaff } from '@/lib/guards'
import { listAdminOffers } from '@/lib/admin-offers'
import type { AdminOfferRecord } from '@/lib/admin-offer-types'
import { OffersClient } from './offers-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Offers · BestForex Admin' }

export default async function AdminOffersPage() {
  const actor = await requireStaff('brokers:manage')

  let offers: AdminOfferRecord[] = []
  let dbError = false
  try {
    offers = await listAdminOffers(actor)
  } catch (error) {
    console.error('[v0] admin offers load failed:', error)
    dbError = true
  }

  return <OffersClient offers={offers} dbError={dbError} />
}

