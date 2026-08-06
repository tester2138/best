/**
 * lib/entity-classifier.ts
 *
 * T41: Mechanical entity-type classifier.
 *
 * Rules are hard-coded from the spec. Do NOT add guesses beyond the
 * lists below. When in doubt, default to 'forex_broker'.
 *
 * Classification CSV is committed at /entity-classification.csv for
 * Kerem to review before treating it as final.
 */

import type { EntityType } from './directory-types'

// ── Exchange keyword fragments (case-insensitive) ──────────────────────────
const EXCHANGE_KEYWORDS = [
  'exchange', 'boerse', 'börse', 'borsa', 'bourse',
  'nasdaq', 'hkex', 'eurex', 'xetra',
]

// ── Exact-match lists (compare against the canonical company name) ─────────
const HEDGE_FUND_NAMES: string[] = [
  'AQR', 'Winton', 'Graham Capital', 'CFM', 'Systematica',
  'Voloridge', 'Verition',
]

const BANK_DESK_NAMES: string[] = [
  'SEB', 'Nordea', 'Danske', 'Handelsbanken', 'Swedbank',
  'Bankinter', 'CaixaBank',
]

const CLEARING_NAMES: string[] = [
  'LCH', 'Pershing', 'Apex Clearing',
]

const INVESTMENT_BANK_NAMES: string[] = [
  'Jefferies', 'Stifel', 'Raymond James', 'Merrill',
]

const PREDICTION_MARKET_NAMES: string[] = [
  'Polymarket', 'Kalshi',
]

// ── Prop-firm detection (applied BEFORE the default) ──────────────────────
const PROP_FIRM_KEYWORDS = ['challenge', 'funded', 'prop trading', 'proprietary']

// ── Classifier ────────────────────────────────────────────────────────────

/**
 * Classifies a company by its name and (optionally) a short description.
 * Returns the deterministic EntityType or 'forex_broker' as default.
 */
export function classifyEntityType(
  name: string,
  description?: string,
): EntityType {
  const nameLower = name.toLowerCase()
  const combinedLower = `${nameLower} ${(description ?? '').toLowerCase()}`

  // 1. Exact match lists (highest priority)
  if (PREDICTION_MARKET_NAMES.some(n => nameLower.includes(n.toLowerCase()))) {
    return 'prediction_market'
  }
  if (CLEARING_NAMES.some(n => nameLower.includes(n.toLowerCase()))) {
    return 'clearing'
  }
  if (INVESTMENT_BANK_NAMES.some(n => nameLower.includes(n.toLowerCase()))) {
    return 'investment_bank'
  }
  if (BANK_DESK_NAMES.some(n => nameLower.includes(n.toLowerCase()))) {
    return 'bank_desk'
  }
  if (HEDGE_FUND_NAMES.some(n => nameLower.includes(n.toLowerCase()))) {
    return 'hedge_fund'
  }

  // 2. Exchange keyword match
  if (EXCHANGE_KEYWORDS.some(kw => nameLower.includes(kw))) {
    return 'exchange'
  }

  // 3. Prop-firm keyword match (name or description)
  if (PROP_FIRM_KEYWORDS.some(kw => combinedLower.includes(kw))) {
    return 'prop_firm'
  }

  // 4. Default
  return 'forex_broker'
}
