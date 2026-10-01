import type { AdPlacementKey, AdSize } from '@/lib/types'

export const AD_CAMPAIGN_PLACEMENTS = [
  'horizontal-1',
  'horizontal-2',
  'square-1',
  'square-2',
] as const satisfies readonly AdPlacementKey[]

export const AD_CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'archived'] as const
export const AD_CAMPAIGN_TYPES = ['paid', 'house'] as const
export const AD_CAMPAIGN_SIZES = ['468x60', '300x250'] as const satisfies readonly AdSize[]

export type AdCampaignStatus = (typeof AD_CAMPAIGN_STATUSES)[number]
export type AdCampaignType = (typeof AD_CAMPAIGN_TYPES)[number]
export type AdCampaignSize = (typeof AD_CAMPAIGN_SIZES)[number]
export type AdCampaignDisplayState = AdCampaignStatus | 'scheduled' | 'ended'

export interface AdCampaignRecord {
  id: string
  placementKey: AdPlacementKey
  campaignName: string
  campaignType: AdCampaignType
  brandName: string
  imageUrl: string
  destinationUrl: string
  altText: string
  label: '' | 'Ad'
  desktopSize: AdCampaignSize

  mobileSize: AdCampaignSize | null
  priority: number
  status: AdCampaignStatus
  startsAt: string | null
  endsAt: string | null
  createdAt: string
}

export interface AdCampaignInput {
  id?: string | null
  placementKey: AdPlacementKey
  campaignName: string
  campaignType: AdCampaignType
  brandName: string
  imageUrl: string
  destinationUrl: string
  altText: string
  label: '' | 'Ad'
  desktopSize: AdCampaignSize
  mobileSize: AdCampaignSize | null
  priority: number
  status: AdCampaignStatus
  startsAt: string | null
  endsAt: string | null
}
