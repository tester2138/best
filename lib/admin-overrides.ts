/**
 * Admin profile overrides.
 *
 * Admins can override any catalog-derived field on a public broker profile
 * (company details, trading conditions, regulation, review prose, FAQs,
 * ratings, score components). Overrides live in the `admin_profile_overrides`
 * table keyed by slug and are deep-applied AFTER the brands-row overlay in
 * lib/public-brokers.ts, so admin edits win over both the static catalog and
 * the portal brands row — but never over a broker's own published portal
 * sections, which render from broker_page_sections.
 *
 * Payload shape: a JSON object whose keys match DirectoryCompany field names.
 * Nested objects are deep-merged; `null` deletes a field; arrays replace.
 */

/** Maximum serialized override payload size (bytes). */
export const ADMIN_OVERRIDES_MAX_BYTES = 100_000

/** Fields that must never be overridden (identity + integrity guards). */
const BLOCKED_OVERRIDE_KEYS = new Set([
  'id',
  'slug',
  'name',
  'isDuplicate',
  'displayRank',
  'isSponsored',
  'isFeatured',
  'verificationStatus',
])

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
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Overrides must be a JSON object')
  }
  const size = JSON.stringify(raw).length
  if (size > ADMIN_OVERRIDES_MAX_BYTES) {
    throw new Error('Overrides payload too large')
  }
  assertAllowedKeys(raw as Record<string, unknown>)
  return raw as Record<string, unknown>
}

function assertAllowedKeys(obj: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(obj)) {
    if (BLOCKED_OVERRIDE_KEYS.has(key)) {
      throw new Error(`Field "${key}" is managed by placement controls and cannot be overridden`)
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      assertAllowedKeys(value as Record<string, unknown>)
    }
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
 * Diff form values against the catalog base to produce a minimal overrides
 * payload. Empty strings / empty arrays mean "clear the field" and are stored
 * as null (deletion) rather than an override.
 */
export function diffOverrides(
  base: Record<string, unknown>,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(values)) {
    const original = base[key]
    if (isEqualJson(value, original)) continue
    if (value === '' || (Array.isArray(value) && value.length === 0)) {
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
