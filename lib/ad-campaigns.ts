import 'server-only'
import { query, queryOne } from '@/lib/portal/db'
import { getAdByPlacement } from '@/data/ads'
import type {
  AdCampaignRecord,
  AdCampaignStatus,
} from '@/lib/ad-campaign-types'
import type { AdPlacement, AdPlacementKey } from '@/lib/types'

/**
 * Banner campaign data access.
 *
 * Admin reads list every campaign; public delivery resolves the single
 * highest-priority in-window active campaign per placement. Public reads
 * swallow database errors and fall back to the static house banners in
 * `data/ads.ts`, so a missing table or a Neon outage can never break a page.
 */

const CAMPAIGN_SELECT = `
  select id,
         placement_key as "placementKey",
         campaign_name as "campaignName",
         campaign_type as "campaignType",
         brand_name as "brandName",
         image_url as "imageUrl",
         destination_url as "destinationUrl",
         alt_text as "altText",
         label,
         desktop_size as "desktopSize",
         mobile_size as "mobileSize",
         priority,
         status,
         starts_at as "startsAt",
         ends_at as "endsAt",
         created_at as "createdAt"
    from public.ad_campaigns
`

/** All campaigns and a database-clock snapshot for the admin table. */
export async function listAdCampaigns(): Promise<{
  campaigns: AdCampaignRecord[]
  currentTimeMs: number
}> {
  const [campaigns, clock] = await Promise.all([
    query<AdCampaignRecord>(
      `${CAMPAIGN_SELECT} order by placement_key asc, priority asc, created_at asc`,
    ),
    queryOne<{ current_time_ms: string }>(
      `select (extract(epoch from now()) * 1000)::bigint::text as current_time_ms`,
    ),
  ])
  return { campaigns, currentTimeMs: Number(clock?.current_time_ms ?? 0) }
}

/**
 * The campaign currently serving a placement: status 'active', inside its
 * schedule window, lowest priority number first. Returns null on database
 * errors so callers can fall back to the static banners.
 */
export async function getActiveAdCampaign(
  placementKey: AdPlacementKey,
): Promise<AdCampaignRecord | null> {
  try {
    return await queryOne<AdCampaignRecord>(
      `${CAMPAIGN_SELECT}
        where placement_key = $1
          and status = 'active'
          and (starts_at is null or starts_at <= now())
          and (ends_at is null or ends_at >= now())
        order by priority asc, created_at asc
        limit 1`,
      [placementKey],
    )
  } catch (err) {
    console.warn('[v0] ad campaign lookup failed, using static banner:', err)
    return null
  }
}

/** Map a campaign row to the AdPlacement shape AdSlot renders. */
export function campaignToAdPlacement(campaign: AdCampaignRecord): AdPlacement {
  return {
    id: campaign.id,
    placementKey: campaign.placementKey,
    brandName: campaign.brandName,
    imageUrl: campaign.imageUrl,
    destinationUrl: campaign.destinationUrl,
    altText: campaign.altText,
    label: campaign.label,
    desktopSize: campaign.desktopSize,
    mobileSize: campaign.mobileSize ?? undefined,
    priority: campaign.priority,
    active: true,
    startsAt: campaign.startsAt ?? undefined,
    endsAt: campaign.endsAt ?? undefined,
  }
}

/**
 * Resolve the creative a placement should show: the live campaign when one
 * is serving, otherwise the static house banner.
 */
export async function resolveAdForPlacement(
  placementKey: AdPlacementKey,
): Promise<AdPlacement | null> {
  const campaign = await getActiveAdCampaign(placementKey)
  if (campaign) return campaignToAdPlacement(campaign)
  return getAdByPlacement(placementKey) ?? null
}

/** Human label for a campaign's effective state given its status and window. */
export function campaignDisplayState(
  campaign: Pick<AdCampaignRecord, 'status' | 'startsAt' | 'endsAt'>,
): AdCampaignStatus | 'scheduled' | 'ended' {
  if (campaign.status !== 'active') return campaign.status
  const now = Date.now()
  if (campaign.startsAt && new Date(campaign.startsAt).getTime() > now)
    return 'scheduled'
  if (campaign.endsAt && new Date(campaign.endsAt).getTime() < now)
    return 'ended'
  return 'active'
}
