import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyAdminProfileOverridesToSections,
  applyOverrides,
  diffOverrides,
  validateOverridesPayload,
} from './admin-overrides'

test('validates numeric and boolean profile controls', () => {
  const payload = { foundedYear: 1999, rating: 0, rank: 24, hasBonus: false }
  assert.deepEqual(validateOverridesPayload(payload), payload)
})

test('diff preserves false and zero while clearing empty profile values', () => {
  const base = {
    foundedYear: 1999,
    rating: 4.8,
    hasBonus: true,
    pros: ['Fast execution'],
  }
  const values = {
    foundedYear: undefined,
    rating: 0,
    hasBonus: false,
    pros: [],
  }

  assert.deepEqual(diffOverrides(base, values), {
    foundedYear: null,
    rating: 0,
    hasBonus: false,
    pros: null,
  })
})

test('applies explicit falsy values and removes fields cleared with null', () => {
  const result = applyOverrides(
    {
      rating: 4.8,
      hasBonus: true,
      scores: { overall: 4.8, trustSafety: 4.5 },
      seo: { metaTitle: 'Catalog title', h1: 'Catalog heading' },
    },
    {
      rating: 0,
      hasBonus: false,
      scores: { overall: 8 },
      seo: { metaTitle: 'Admin title', h1: null },
    },
  )

  assert.deepEqual(result, {
    rating: 0,
    hasBonus: false,
    scores: { overall: 8, trustSafety: 4.5 },
    seo: { metaTitle: 'Admin title' },
  })
})

test('rejects out-of-range editorial ratings and placement-owned fields', () => {
  assert.throws(() => validateOverridesPayload({ rating: 10.1 }), /rating is outside its allowed range/)
  assert.throws(() => validateOverridesPayload({ isSponsored: true }), /managed by placement controls/)
})

test('admin profile fields supersede merchant sections without discarding untouched content', () => {
  const sections = applyAdminProfileOverridesToSections(
    {
      hero: { short_description: 'Merchant summary', tagline: 'Keep this' },
      pros_cons: { pros: ['Merchant pro'], cons: ['Merchant con'] },
      faq: { items: [{ q: 'Merchant question', a: 'Merchant answer' }] },
      regulation: { regulators: ['Old regulator'], body: '<p>Merchant body</p>' },
      about: { body: '<p>Merchant about</p>' },
      key_facts: { min_deposit_amount: 100, min_deposit_currency: 'USD', platforms: ['Old platform'] },
      trading_conditions: { account_types: [{ name: 'Merchant account' }] },
    },
    {
      shortDescription: 'Admin summary',
      pros: ['Admin pro'],
      cons: null,
      faqItems: [{ question: 'Admin question', answer: 'Admin answer' }],
      regulators: ['FCA'],
      regulationSummary: null,
      longDescription: null,
      minDeposit: null,
      platforms: ['MT5'],
      instruments: null,
      accountTypes: null,
    },
    {
      shortDescription: 'Admin summary',
      pros: ['Admin pro'],
      cons: undefined,
      faqItems: [{ question: 'Admin question', answer: 'Admin answer' }],
      regulators: ['FCA'],
      regulationSummary: undefined,
      longDescription: undefined,
      minDeposit: undefined,
      platforms: ['MT5'],
      instruments: undefined,
      accountTypes: undefined,
    },
  )

  assert.deepEqual(sections.hero, { short_description: 'Admin summary', tagline: 'Keep this' })
  assert.deepEqual(sections.pros_cons, { pros: ['Admin pro'], cons: [] })
  assert.deepEqual(sections.faq, { items: [{ q: 'Admin question', a: 'Admin answer' }] })
  assert.deepEqual(sections.regulation, {
    regulators: ['FCA'],
    body: undefined,
    admin_summary: '',
  })
  assert.deepEqual(sections.about, { body: undefined })
  assert.deepEqual(sections.key_facts, { platforms: ['MT5'], instruments: [] })
  assert.deepEqual(sections.trading_conditions, { account_types: [] })
})
