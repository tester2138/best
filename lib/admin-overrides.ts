/**
 * Admin profile overrides.
 *
 * Admins can override any catalog-derived field on a public broker profile
 * (company details, trading conditions, regulation, review prose, FAQs,
 * ratings, score components). Overrides live in the `admin_profile_overrides`
 * table keyed by slug and are deep-applied AFTER the brands-row overlay in
 * lib/public-brokers.ts. The public profile also applies explicit admin fields
 * after merchant-published sections, keeping admin edits authoritative.
 *
 * Payload shape: a JSON object whose keys match DirectoryCompany field names.
 * Nested objects are deep-merged; `null` deletes a field; arrays replace.
 */

/** Maximum serialized override payload size (bytes). */
export const ADMIN_OVERRIDES_MAX_BYTES = 100_000

const BLOCKED_OVERRIDE_KEYS = new Set([
  'id',
  'slug',
  'isDuplicate',
  'displayRank',
  'isSponsored',
  'isFeatured',
  'verificationStatus',
])

const PROFILE_OVERRIDE_KEYS = new Set([
  'name', 'legalName', 'logoUrl', 'websiteUrl', 'affiliateUrl', 'category', 'entityType',
  'reviewBody', 'faqItems', 'reviewerName', 'reviewDate', 'updateDate', 'testedSpreads',
  'feesTable', 'platformBreakdown', 'expandedPros', 'expandedCons', 'dataQualityStage',
  'shortDescription', 'longDescription', 'foundedYear', 'headquarters', 'country', 'rating',
  'ratingLabel', 'rank', 'regulators', 'regulationSummary', 'platforms', 'instruments',
  'currencyPairs', 'minDeposit', 'spreadsFrom', 'commissions', 'maxLeverageRetail',
  'maxLeverageProfessional', 'depositMethods', 'withdrawalMethods', 'withdrawalTime',
  'accountTypes', 'hasBonus', 'bonusSummary', 'propFirmDetails', 'pros', 'cons', 'scores',
  'seo', 'sourceUrls', 'lastVerifiedAt', 'lastUpdatedAt', 'createdAt', 'bestFor', 'badges',
  'mobileApps', 'countriesServed', 'restrictedCountries', 'inactivityFee', 'bonuses', 'trustpilot',
])

const STRING_FIELDS = new Set([
  'name', 'legalName', 'logoUrl', 'websiteUrl', 'affiliateUrl', 'category', 'entityType',
  'reviewBody', 'reviewerName', 'reviewDate', 'updateDate', 'dataQualityStage',
  'shortDescription', 'longDescription', 'headquarters', 'country', 'ratingLabel',
  'regulationSummary', 'currencyPairs', 'minDeposit', 'spreadsFrom', 'commissions',
  'maxLeverageRetail', 'maxLeverageProfessional', 'withdrawalTime', 'bonusSummary',
  'inactivityFee', 'lastVerifiedAt', 'lastUpdatedAt', 'createdAt',
])

const STRING_ARRAY_FIELDS = new Set([
  'platforms', 'instruments', 'depositMethods', 'withdrawalMethods', 'pros', 'cons',
  'expandedPros', 'expandedCons', 'bestFor', 'badges', 'mobileApps', 'countriesServed',
  'restrictedCountries', 'sourceUrls',
])

const OBJECT_ARRAY_FIELDS: Record<string, { required: string[]; fields: Record<string, 'string' | 'string[]'> }> = {
  faqItems: { required: ['question', 'answer'], fields: { question: 'string', answer: 'string' } },
  testedSpreads: { required: ['instrument', 'spread'], fields: { instrument: 'string', spread: 'string', tested: 'string' } },
  feesTable: { required: ['instrument', 'spread'], fields: { instrument: 'string', spread: 'string', commission: 'string' } },
  platformBreakdown: { required: ['name', 'description'], fields: { name: 'string', description: 'string' } },
  accountTypes: {
    required: ['name'],
    fields: { name: 'string', minDeposit: 'string', spreadsFrom: 'string', commission: 'string', leverage: 'string', features: 'string[]' },
  },
  bonuses: {
    required: ['title', 'description', 'type'],
    fields: { title: 'string', description: 'string', code: 'string', expiresAt: 'string', terms: 'string', value: 'string', type: 'string' },
  },
}

const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

export function validateOverridesPayload(raw: unknown): Record<string, unknown> {
  if (raw === undefined || raw === null) return {}
  if (typeof raw === 'string') {
    if (raw.trim() === '') return {}
    try {
      raw = JSON.parse(raw)
    } catch {
      throw new Error('Overrides must be valid JSON')
    }
  }
  if (!isPlainRecord(raw)) throw new Error('Overrides must be a JSON object')

  let nodeCount = 0
  assertSafeJsonTree(raw, 'overrides', 0, () => {
    nodeCount += 1
    if (nodeCount > 5_000) throw new Error('Overrides contain too many values')
  })

  const serialized = JSON.stringify(raw)
  if (new TextEncoder().encode(serialized).byteLength > ADMIN_OVERRIDES_MAX_BYTES) {
    throw new Error('Overrides payload too large')
  }

  for (const [key, value] of Object.entries(raw)) {
    if (BLOCKED_OVERRIDE_KEYS.has(key)) {
      throw new Error(`Field "${key}" is managed by placement controls and cannot be overridden`)
    }
    if (!PROFILE_OVERRIDE_KEYS.has(key)) throw new Error(`Unsupported profile field: ${key}`)
    validateFieldValue(key, value)
  }

  return raw
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function assertSafeJsonTree(
  value: unknown,
  path: string,
  depth: number,
  countNode: () => void,
): void {
  countNode()
  if (depth > 10) throw new Error('Overrides are nested too deeply')
  if (value === null || typeof value === 'boolean') return
  if (typeof value === 'string') {
    if (new TextEncoder().encode(value).byteLength > 30_000) {
      throw new Error(`Field at ${path} is too long`)
    }
    return
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Invalid number at ${path}`)
    return
  }
  if (Array.isArray(value)) {
    if (value.length > 500) throw new Error(`Too many entries at ${path}`)
    value.forEach((item, index) => assertSafeJsonTree(item, `${path}[${index}]`, depth + 1, countNode))
    return
  }
  if (!isPlainRecord(value)) throw new Error(`Invalid object at ${path}`)
  for (const [key, nested] of Object.entries(value)) {
    if (UNSAFE_OBJECT_KEYS.has(key)) throw new Error(`Unsafe object key at ${path}`)
    assertSafeJsonTree(nested, `${path}.${key}`, depth + 1, countNode)
  }
}

function validateFieldValue(key: string, value: unknown): void {
  if (value === null) return

  if (STRING_FIELDS.has(key)) {
    if (typeof value !== 'string') throw new Error(`${key} must be text`)
    return
  }
  if (key === 'rating' || key === 'rank' || key === 'foundedYear') {
    if (typeof value !== 'number') throw new Error(`${key} must be a number`)
    const [min, max] = key === 'rating' ? [0, 10] : key === 'foundedYear' ? [1600, 2200] : [1, 999_999]
    if (value < min || value > max || (key !== 'rating' && !Number.isInteger(value))) {
      throw new Error(`${key} is outside its allowed range`)
    }
    return
  }
  if (key === 'hasBonus') {
    if (typeof value !== 'boolean') throw new Error('hasBonus must be a boolean')
    return
  }
  if (STRING_ARRAY_FIELDS.has(key)) {
    assertStringArray(value, key)
    return
  }
  if (key === 'regulators') {
    if (!Array.isArray(value) || value.length > 200) throw new Error('regulators must be an array')
    for (const [index, item] of value.entries()) {
      if (typeof item === 'string') continue
      assertObjectFields(item, `regulators[${index}]`, ['authority', 'country', 'licenseNumber'], ['authority'])
      for (const [field, fieldValue] of Object.entries(item)) {
        if (field !== 'authority' && field !== 'country' && field !== 'licenseNumber') throw new Error(`Unsupported regulator field: ${field}`)
        if (typeof fieldValue !== 'string') throw new Error(`regulators[${index}].${field} must be text`)
      }
    }
    return
  }
  if (OBJECT_ARRAY_FIELDS[key]) {
    const schema = OBJECT_ARRAY_FIELDS[key]
    if (!Array.isArray(value) || value.length > 200) throw new Error(`${key} must be an array`)
    value.forEach((item, index) => {
      const record = assertObjectFields(item, `${key}[${index}]`, Object.keys(schema.fields), schema.required)
      validateObjectFields(record, schema.fields, `${key}[${index}]`)
    })
    return
  }
  if (key === 'scores') {
    const record = assertObjectFields(value, 'scores', ['overall', 'trustSafety', 'tradingConditions', 'platforms', 'researchEducation', 'customerService', 'mobileTrading'], ['overall'])
    for (const [field, score] of Object.entries(record)) {
      if (typeof score !== 'number' || score < 0 || score > 10) throw new Error(`scores.${field} must be between 0 and 10`)
    }
    return
  }
  if (key === 'seo') {
    const record = assertObjectFields(value, 'seo', ['metaTitle', 'metaDescription', 'h1', 'faqSchema'], [])
    for (const field of ['metaTitle', 'metaDescription', 'h1']) {
      const fieldValue = record[field]
      if (fieldValue !== undefined && fieldValue !== null && typeof fieldValue !== 'string') {
        throw new Error(`seo.${field} must be text`)
      }
    }
    if (record.faqSchema !== undefined && record.faqSchema !== null) {
      validateFieldValue('faqItems', record.faqSchema)
    }
    return
  }
  if (key === 'propFirmDetails') {
    const fields: Record<string, 'string' | 'string[]' | 'boolean'> = {
      challengeTypes: 'string[]', accountSizes: 'string[]', evaluationFee: 'string',
      profitSplit: 'string', payoutFrequency: 'string', dailyDrawdown: 'string',
      maximumDrawdown: 'string', tradingRules: 'string[]', allowedInstruments: 'string[]',
      scalingPlan: 'string', restrictedCountries: 'string[]', kycRequired: 'boolean', refundPolicy: 'string',
    }
    validateObjectFields(assertObjectFields(value, 'propFirmDetails', Object.keys(fields), []), fields, 'propFirmDetails')
    return
  }
  if (key === 'trustpilot') {
    const record = assertObjectFields(value, 'trustpilot', ['score', 'totalReviews', 'oneStarPercentage'], ['score', 'totalReviews'])
    if (typeof record.score !== 'number' || record.score < 0 || record.score > 5) throw new Error('trustpilot.score must be between 0 and 5')
    if (!Number.isInteger(record.totalReviews) || (record.totalReviews as number) < 0) throw new Error('trustpilot.totalReviews must be a non-negative integer')
    if (record.oneStarPercentage !== undefined && record.oneStarPercentage !== null && (typeof record.oneStarPercentage !== 'number' || record.oneStarPercentage < 0 || record.oneStarPercentage > 100)) {
      throw new Error('trustpilot.oneStarPercentage must be between 0 and 100')
    }
  }
}

function assertStringArray(value: unknown, path: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${path} must be a list of text values`)
  }
}

function assertObjectFields(
  value: unknown,
  path: string,
  allowed: string[],
  required: string[],
): Record<string, unknown> {
  if (!isPlainRecord(value)) throw new Error(`${path} must be an object`)
  for (const field of Object.keys(value)) {
    if (!allowed.includes(field)) throw new Error(`Unsupported field at ${path}.${field}`)
  }
  for (const field of required) {
    if (!(field in value)) throw new Error(`${path}.${field} is required`)
  }
  return value
}

function validateObjectFields(
  value: Record<string, unknown>,
  fields: Record<string, 'string' | 'string[]' | 'boolean'>,
  path: string,
): void {
  for (const [field, fieldValue] of Object.entries(value)) {
    if (fieldValue === null) continue
    const type = fields[field]
    if (type === 'string' && typeof fieldValue !== 'string') throw new Error(`${path}.${field} must be text`)
    if (type === 'string[]') assertStringArray(fieldValue, `${path}.${field}`)
    if (type === 'boolean' && typeof fieldValue !== 'boolean') throw new Error(`${path}.${field} must be a boolean`)
  }
}

/**
 * Deep-apply overrides onto a base object. `null` removes the key; plain
 * objects merge recursively; everything else replaces.
 */
export function applyOverrides<T extends object>(base: T, overrides: unknown): T {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (value === null) {
      delete out[key]
      continue
    }
    const current = out[key]
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      out[key] = applyOverrides(current, value)
    } else {
      out[key] = value
    }
  }
  return out as T
}

/**
 * Diff resolved form values against the public base. Empty values clear the
 * stored override rather than leaving an accidental empty overlay behind.
 */
export function diffOverrides(
  base: Record<string, unknown>,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(values)) {
    const original = base[key]
    if (isEqualJson(value, original)) continue
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      if (original !== undefined && original !== null && original !== '') out[key] = null
      continue
    }
    out[key] = value
  }
  return out
}

function isEqualJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/** Apply explicit admin field overrides after broker-published page sections. */
export function applyAdminProfileOverridesToSections(
  baseSections: Record<string, unknown> | null | undefined,
  overrides: Record<string, unknown>,
  profile: Record<string, unknown>,
): Record<string, unknown> {
  const sections: Record<string, unknown> = { ...(baseSections ?? {}) }
  const hasOverride = (field: string) => Object.prototype.hasOwnProperty.call(overrides, field)
  const section = (key: string) =>
    isPlainRecord(sections[key]) ? { ...(sections[key] as Record<string, unknown>) } : {}

  if (['shortDescription', 'foundedYear', 'headquarters'].some(hasOverride)) {
    const hero = section('hero')
    if (hasOverride('shortDescription')) hero.short_description = profile.shortDescription
    if (hasOverride('foundedYear')) hero.founded_year = profile.foundedYear
    if (hasOverride('headquarters')) hero.hq_city = profile.headquarters
    sections.hero = hero
  }

  if (hasOverride('pros') || hasOverride('cons')) {
    const prosCons = section('pros_cons')
    if (hasOverride('pros')) prosCons.pros = Array.isArray(profile.pros) ? profile.pros : []
    if (hasOverride('cons')) prosCons.cons = Array.isArray(profile.cons) ? profile.cons : []
    sections.pros_cons = prosCons
  }

  if (hasOverride('faqItems')) {
    const faq = section('faq')
    faq.items = Array.isArray(profile.faqItems)
      ? profile.faqItems.flatMap((item) => {
          if (!isPlainRecord(item)) return []
          if (typeof item.question !== 'string' || typeof item.answer !== 'string') return []
          return [{ q: item.question, a: item.answer }]
        })
      : []
    sections.faq = faq
  }

  if (hasOverride('regulators') || hasOverride('regulationSummary')) {
    const regulation = section('regulation')
    if (hasOverride('regulators')) {
      regulation.regulators = Array.isArray(profile.regulators)
        ? profile.regulators.flatMap((item) => {
            if (typeof item === 'string') return [item]
            if (isPlainRecord(item) && typeof item.authority === 'string') return [item.authority]
            return []
          })
        : []
    }
    if (hasOverride('regulationSummary')) {
      regulation.admin_summary =
        typeof profile.regulationSummary === 'string' ? profile.regulationSummary : ''
      regulation.body = undefined
    }
    sections.regulation = regulation
  }

  if (hasOverride('longDescription')) {
    const about = section('about')
    about.body = undefined
    sections.about = about
  }

  const keyFactFields = [
    ['minDeposit', 'min_deposit_amount'],
    ['spreadsFrom', 'spreads_from'],
    ['maxLeverageRetail', 'max_leverage'],
  ] as const
  const hasKeyFactOverride =
    keyFactFields.some(([field]) => hasOverride(field)) ||
    hasOverride('platforms') ||
    hasOverride('instruments') ||
    hasOverride('depositMethods')
  if (hasKeyFactOverride) {
    const keyFacts = section('key_facts')
    for (const [field, key] of keyFactFields) {
      if (hasOverride(field)) {
        delete keyFacts[key]
        if (field === 'minDeposit') delete keyFacts.min_deposit_currency
      }
    }
    if (hasOverride('platforms')) keyFacts.platforms = Array.isArray(profile.platforms) ? profile.platforms : []
    if (hasOverride('instruments')) keyFacts.instruments = Array.isArray(profile.instruments) ? profile.instruments : []
    if (hasOverride('depositMethods')) {
      keyFacts.deposit_methods = Array.isArray(profile.depositMethods) ? profile.depositMethods : []
    }
    const hasValues = Object.values(keyFacts).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '',
    )
    if (hasValues) sections.key_facts = keyFacts
    else delete sections.key_facts
  }

  if (hasOverride('accountTypes')) {
    const tradingConditions = section('trading_conditions')
    tradingConditions.account_types = []
    sections.trading_conditions = tradingConditions
  }

  return sections
}
