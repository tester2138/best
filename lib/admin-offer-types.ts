import type { Offer } from '@/lib/types'

export const ADMIN_OFFER_STATUSES = ['draft', 'active', 'paused', 'archived'] as const
export const ADMIN_OFFER_TYPES = ['deposit', 'no-deposit', 'cashback', 'rebate', 'other'] as const satisfies readonly Offer['type'][]

export type AdminOfferStatus = (typeof ADMIN_OFFER_STATUSES)[number]
export type AdminOfferType = (typeof ADMIN_OFFER_TYPES)[number]

export interface AdminOfferRecord {
  id: string
  brokerId: string
  brokerName: string
  brokerLogo: string | null
  title: string
  description: string
  value: string
  code: string | null
  type: AdminOfferType
  terms: string
  affiliateUrl: string
  isFeatured: boolean
  isExclusive: boolean
  startsAt: string | null
  endsAt: string | null
  status: AdminOfferStatus
  sortOrder: number
  createdAt: string
}
