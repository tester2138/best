import { NextResponse } from 'next/server'
import { AD_CAMPAIGN_PLACEMENTS } from '@/lib/ad-campaign-types'
import { resolveAdForPlacement } from '@/lib/ad-campaigns'
import type { AdPlacementKey } from '@/lib/types'

/**
 * Public ad delivery: resolves the creative for one placement — the live
 * campaign from `ad_campaigns` when one is serving, otherwise the static
 * house banner. Always fresh so campaign changes take effect immediately.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ placementKey: string }> },
) {
  const { placementKey } = await params
  if (
    !AD_CAMPAIGN_PLACEMENTS.includes(
      placementKey as (typeof AD_CAMPAIGN_PLACEMENTS)[number],
    )
  ) {
    return NextResponse.json({ error: 'Unknown placement' }, { status: 404 })
  }

  const ad = await resolveAdForPlacement(placementKey as AdPlacementKey)
  return NextResponse.json(
    { ad },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
