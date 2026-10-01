import { requireStaff } from '@/lib/guards'
import { listAdCampaigns } from '@/lib/ad-campaigns'
import type { AdCampaignRecord } from '@/lib/ad-campaign-types'
import { AdvertisingClient } from './advertising-client'

export const metadata = { title: 'Advertising · BestForex Admin' }

export default async function AdvertisingPage() {
  await requireStaff('brokers:manage')

  let campaigns: AdCampaignRecord[] = []
  let dbError = false
  try {
    campaigns = await listAdCampaigns()
  } catch (err) {
    console.error('[v0] admin campaigns load failed:', err)
    dbError = true
  }

  return <AdvertisingClient campaigns={campaigns} dbError={dbError} />
}
