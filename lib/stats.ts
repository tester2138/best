/**
 * lib/stats.ts — Single source of truth for platform statistics.
 *
 * T30: Values are derived from directoryCompanies at build time (SSG) so they
 * stay accurate as data grows. Kerem-confirmed fallbacks are used when the
 * computed value is zero (e.g. during a cold build before directory.ts loads).
 *
 * Fallbacks confirmed by Kerem 2026-07-06:
 *   totalListed=1826, reviewedCount=250, regulatorCount=141, dataPointCount=50
 */
import { directoryCompanies } from '@/data/directory'
import { getDirectoryRegulators } from '@/data/directory'

// ── Derived at build time ────────────────────────────────────────────────────

const _total = directoryCompanies.length
const _reviewed = directoryCompanies.filter(
  c => c.dataQualityStage === 'reviewed' || c.dataQualityStage === 'enriched',
).length
const _regulators = getDirectoryRegulators().length

/** Total broker/firm entries in the directory (reviewed + enriched + basic). */
export const totalListed: number = _total > 0 ? _total : 1826

/** Fully reviewed + enriched profiles (indexed, substantive content). */
export const reviewedCount: number = _reviewed > 0 ? _reviewed : 250

/** Unique regulatory bodies tracked across all profiles. */
export const regulatorCount: number = _regulators > 0 ? _regulators : 141

/** Data points assessed per broker during review process. */
export const dataPointCount = 50

// ── Extended stats used by media kit and homepage ────────────────────────────
export const monthlyVisitors = '1M+'
export const brokerComparisons = '100K+'
export const highIntentTraffic = '85%'
export const adPlacements = 15
export const globalReach = '190+'
