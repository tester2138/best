import type { DirectoryCompany } from '@/lib/directory-types'
import { isRetailEntityType } from '@/lib/directory-types'

/**
 * Determines whether a broker profile has enough unique, substantive content to be
 * safely indexed. Indexing thousands of near-empty "basic" stubs (name + logo only)
 * is a sitewide thin-content risk, so we only index profiles at the `enriched` stage
 * or better (which carry description, country, platforms and trading info).
 *
 * `basic` profiles are served with `noindex, follow` and excluded from the sitemap.
 *
 * T41: Non-retail entity types (exchange, hedge_fund, bank_desk, clearing,
 * investment_bank, prediction_market) are also forced to noindex since they
 * are not the audience BestForex.io serves.
 */
const INDEXABLE_STAGES = new Set(['enriched', 'reviewed', 'claimed', 'featured'])

export function isIndexableBroker(
  company: Pick<DirectoryCompany, 'dataQualityStage' | 'entityType'>,
): boolean {
  // T41: non-retail entities always noindex, regardless of data quality stage.
  if (!isRetailEntityType(company.entityType)) return false
  return INDEXABLE_STAGES.has(company.dataQualityStage)
}
