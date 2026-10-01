import { hasGlobalStaffScope, requireStaff } from '@/lib/guards'
import { notFound } from 'next/navigation'
import { listAdCampaigns } from '@/lib/ad-campaigns'
import type { AdCampaignRecord } from '@/lib/ad-campaign-types'
import { AdvertisingClient } from './advertising-client'

export const metadata = { title: 'Advertising · BestForex Admin' }

export default async function AdvertisingPage() {
  const actor = await requireStaff('brokers:manage')
  if (!(await hasGlobalStaffScope(actor))) notFound()

  let campaigns: AdCampaignRecord[] = []
  let currentTimeMs = 0
  let dbError = false
  try {
    const result = await listAdCampaigns()
    campaigns = result.campaigns
    currentTimeMs = result.currentTimeMs
  } catch (err) {
    console.error('[v0] admin campaigns load failed:', err)
    dbError = true
  }

  return <AdvertisingClient campaigns={campaigns} dbError={dbError} initialNow={currentTimeMs} />
}
