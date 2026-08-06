/**
 * The single most important file in the portal build (Blueprint Section 8).
 * Twelve editable sections are defined once as data; the editor UI, the zod
 * validation, the moderation decision, and the public renderer all derive from
 * this registry. One generic editor engine, not twelve bespoke forms.
 * Limits below are CANONICAL — never loosen them in code.
 */

export const SECTION_KEYS = [
  'hero',
  'key_facts',
  'about',
  'pros_cons',
  'trading_conditions',
  'platforms',
  'deposits_withdrawals',
  'regulation',
  'support',
  'faq',
  'company',
  'cta',
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]

export type Widget =
  | 'text'
  | 'textarea'
  | 'rich'
  | 'int'
  | 'year'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'stringList'
  | 'objectList'
  | 'url'
  | 'email'
  | 'tel'

export interface FieldDef {
  key: string
  label: string
  widget: Widget
  required?: boolean
  max?: number /* char cap; for rich = plain-text chars after stripping tags */
  min?: number
  maxItems?: number
  minItems?: number
  itemMax?: number /* per item cap for stringList */
  intMin?: number
  intMax?: number
  options?: readonly string[]
  fields?: FieldDef[] /* children for objectList */
  help?: string /* short helper text under the input */
}

export interface SectionDef {
  key: SectionKey
  title: string
  moderated: boolean /* true = every publish of this section queues in hybrid mode */
  fields: FieldDef[]
}

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'AUD',
  'CAD',
  'TRY',
  'AED',
  'SGD',
] as const

export const PLATFORMS = [
  'MetaTrader 4',
  'MetaTrader 5',
  'cTrader',
  'TradingView',
  'DXtrade',
  'Match-Trader',
  'Proprietary web platform',
  'Proprietary mobile app',
  'FIX API',
  'Other',
] as const

export const SUPPORT_CHANNELS = [
  'Live chat',
  'Email',
  'Phone',
  'WhatsApp',
  'Telegram',
  'Help center',
] as const

export const SOCIAL_PLATFORMS = ['x', 'facebook', 'instagram', 'linkedin', 'youtube', 'telegram'] as const

export const REGULATORS = [
  'FCA (United Kingdom)',
  'CySEC (Cyprus)',
  'ASIC (Australia)',
  'FSCA (South Africa)',
  'FSA (Seychelles)',
  'FSC (Mauritius)',
  'FSC (British Virgin Islands)',
  'SCB (The Bahamas)',
  'CIMA (Cayman Islands)',
  'VFSC (Vanuatu)',
  'FMA (New Zealand)',
  'MAS (Singapore)',
  'SFC (Hong Kong)',
  'FSA (Japan)',
  'DFSA (Dubai)',
  'FSRA (Abu Dhabi)',
  'CMA (Kenya)',
  'BaFin (Germany)',
  'AMF (France)',
  'CONSOB (Italy)',
  'CNMV (Spain)',
  'FINMA (Switzerland)',
  'CIRO (Canada)',
  'CVM (Brazil)',
  'CBCS (Curacao)',
  'Other',
] as const

import { COUNTRY_NAMES } from './countries'

export const SECTIONS: Record<SectionKey, SectionDef> = {
  hero: {
    key: 'hero',
    title: 'Hero & introduction',
    moderated: false,
    fields: [
      {
        key: 'tagline',
        label: 'Tagline',
        widget: 'text',
        max: 80,
        help: 'One line under the brand name. Plain text, no line breaks.',
      },
      {
        key: 'short_description',
        label: 'Short description',
        widget: 'textarea',
        required: true,
        min: 40,
        max: 320,
        help: 'Max 3 line breaks.',
      },
      { key: 'founded_year', label: 'Founded', widget: 'year', intMin: 1900 },
      { key: 'hq_country', label: 'Headquarters country', widget: 'select', options: COUNTRY_NAMES },
      { key: 'hq_city', label: 'Headquarters city', widget: 'text', max: 60 },
    ],
  },
  key_facts: {
    key: 'key_facts',
    title: 'Key facts',
    moderated: false,
    fields: [
      { key: 'min_deposit_amount', label: 'Minimum deposit', widget: 'int', intMin: 0, intMax: 1000000 },
      { key: 'min_deposit_currency', label: 'Currency', widget: 'select', options: CURRENCIES },
      {
        key: 'max_leverage',
        label: 'Maximum leverage',
        widget: 'text',
        max: 40,
        help: 'Free text like 1:30 or 1:500.',
      },
      { key: 'spread_from', label: 'Spreads from', widget: 'text', max: 60 },
      {
        key: 'instruments_summary',
        label: 'Instruments',
        widget: 'text',
        max: 200,
        help: 'Example: 2,800+ instruments across forex, indices, commodities, crypto CFDs.',
      },
      { key: 'account_types', label: 'Account types', widget: 'stringList', maxItems: 6, itemMax: 60 },
      { key: 'demo_account', label: 'Demo account available', widget: 'boolean' },
    ],
  },
  about: {
    key: 'about',
    title: 'About the broker',
    moderated: false,
    fields: [
      {
        key: 'body',
        label: 'About',
        widget: 'rich',
        required: true,
        min: 100,
        max: 3000,
        help: 'Bold, italic and lists only. Limit counts visible characters, not HTML.',
      },
    ],
  },
  pros_cons: {
    key: 'pros_cons',
    title: 'Pros & cons',
    moderated: false,
    fields: [
      { key: 'pros', label: 'Pros', widget: 'stringList', required: true, minItems: 2, maxItems: 8, itemMax: 120 },
      {
        key: 'cons',
        label: 'Cons',
        widget: 'stringList',
        required: true,
        minItems: 1,
        maxItems: 8,
        itemMax: 120,
        help: 'At least one con is mandatory. All-positive pages read as ads and hurt credibility.',
      },
    ],
  },
  trading_conditions: {
    key: 'trading_conditions',
    title: 'Trading conditions',
    moderated: false,
    fields: [
      { key: 'fees_summary', label: 'Fees summary', widget: 'textarea', max: 400 },
      { key: 'commission_note', label: 'Commission', widget: 'text', max: 200 },
      { key: 'swap_note', label: 'Swap / overnight', widget: 'text', max: 200 },
    ],
  },
  platforms: {
    key: 'platforms',
    title: 'Platforms',
    moderated: false,
    fields: [
      { key: 'platforms', label: 'Platforms', widget: 'multiselect', options: PLATFORMS },
      { key: 'platform_note', label: 'Note', widget: 'text', max: 200 },
    ],
  },
  deposits_withdrawals: {
    key: 'deposits_withdrawals',
    title: 'Deposits & withdrawals',
    moderated: false,
    fields: [
      { key: 'deposit_methods', label: 'Deposit methods', widget: 'stringList', maxItems: 12, itemMax: 40 },
      { key: 'withdrawal_methods', label: 'Withdrawal methods', widget: 'stringList', maxItems: 12, itemMax: 40 },
      { key: 'withdrawal_time', label: 'Typical withdrawal time', widget: 'text', max: 80 },
      { key: 'fees_note', label: 'Payment fees note', widget: 'text', max: 200 },
    ],
  },
  regulation: {
    key: 'regulation',
    title: 'Regulation & licenses',
    moderated: true,
    fields: [
      {
        key: 'licenses',
        label: 'Licenses',
        widget: 'objectList',
        maxItems: 10,
        fields: [
          { key: 'regulator', label: 'Regulator', widget: 'select', required: true, options: REGULATORS },
          { key: 'license_no', label: 'License number', widget: 'text', max: 40 },
          { key: 'jurisdiction', label: 'Jurisdiction', widget: 'select', options: COUNTRY_NAMES },
          {
            key: 'verify_url',
            label: 'Register link',
            widget: 'url',
            help: 'Optional. Must point to the regulator, not to the broker site.',
          },
        ],
      },
    ],
  },
  support: {
    key: 'support',
    title: 'Customer support',
    moderated: false,
    fields: [
      { key: 'channels', label: 'Channels', widget: 'multiselect', options: SUPPORT_CHANNELS },
      { key: 'support_email', label: 'Support email', widget: 'email' },
      { key: 'support_phone', label: 'Support phone', widget: 'tel', help: 'E.164, like +442071234567.' },
      { key: 'hours', label: 'Hours', widget: 'text', max: 120 },
      { key: 'languages', label: 'Languages', widget: 'stringList', maxItems: 20, itemMax: 30 },
    ],
  },
  faq: {
    key: 'faq',
    title: 'FAQ',
    moderated: false,
    fields: [
      {
        key: 'items',
        label: 'Questions',
        widget: 'objectList',
        maxItems: 12,
        fields: [
          { key: 'q', label: 'Question', widget: 'text', required: true, max: 150 },
          { key: 'a', label: 'Answer', widget: 'textarea', required: true, max: 800 },
        ],
        help: 'Rendered as plain page content. Does not emit FAQ structured data.',
      },
    ],
  },
  company: {
    key: 'company',
    title: 'Company details',
    moderated: true,
    fields: [
      { key: 'legal_name', label: 'Legal entity name', widget: 'text', max: 120 },
      { key: 'registered_address', label: 'Registered address', widget: 'textarea', max: 240 },
      {
        key: 'website_url',
        label: 'Official website',
        widget: 'url',
        required: true,
        help: 'Host must match one of the official domains set by the admin.',
      },
      {
        key: 'social_links',
        label: 'Social profiles',
        widget: 'objectList',
        maxItems: 6,
        fields: [
          { key: 'platform', label: 'Platform', widget: 'select', required: true, options: SOCIAL_PLATFORMS },
          { key: 'url', label: 'URL', widget: 'url', required: true },
        ],
      },
    ],
  },
  cta: {
    key: 'cta',
    title: 'Call to action',
    moderated: true,
    fields: [
      {
        key: 'signup_url',
        label: 'Sign-up URL',
        widget: 'url',
        required: true,
        help: 'Host must match an official domain. Rendered via the tracked /out link.',
      },
      { key: 'cta_label', label: 'Button label', widget: 'text', max: 25 },
    ],
  },
}

/** Convenience: ordered list of section defs for iterating the editor nav. */
export const SECTION_LIST: SectionDef[] = SECTION_KEYS.map((k) => SECTIONS[k])
