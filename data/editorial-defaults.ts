import type { EditorialContentEntry } from '@/lib/editorial-content'

export const LEARN_PAGE_DEFAULTS: EditorialContentEntry[] = [
  {
    id: 'default-learn-index',
    kind: 'learn_page',
    slug: 'index',
    title: 'Learn Forex & CFD Trading',
    summary:
      'Educational guides and a trading glossary from the BestForex.io editorial team. Content publishing in stages — bookmark this page.',
    content: '',
    status: 'published',
    metaTitle: 'Learn Forex Trading | Education Hub | BestForex.io',
    metaDescription:
      'Forex and CFD trading education hub. Guides, glossary terms, and resources for traders of all levels.',
    relatedTerms: [],
    sortOrder: 0,
    updatedAt: null,
  },
  {
    id: 'default-learn-what-is-forex-trading',
    kind: 'learn_page',
    slug: 'what-is-forex-trading',
    title: 'What is Forex Trading?',
    summary: 'A practical introduction to the foreign exchange market.',
    content: '',
    status: 'coming_soon',
    relatedTerms: [],
    sortOrder: 1,
    updatedAt: null,
  },
  {
    id: 'default-learn-how-to-choose-a-forex-broker',
    kind: 'learn_page',
    slug: 'how-to-choose-a-forex-broker',
    title: 'How to Choose a Forex Broker',
    summary: 'A checklist for comparing regulation, costs, platforms, and service.',
    content: '',
    status: 'coming_soon',
    relatedTerms: [],
    sortOrder: 2,
    updatedAt: null,
  },
  {
    id: 'default-learn-understanding-leverage-and-margin',
    kind: 'learn_page',
    slug: 'understanding-leverage-and-margin',
    title: 'Understanding Leverage and Margin',
    summary: 'Learn how leverage changes exposure and why margin matters.',
    content: '',
    status: 'coming_soon',
    relatedTerms: [],
    sortOrder: 3,
    updatedAt: null,
  },
  {
    id: 'default-learn-forex-regulation-explained',
    kind: 'learn_page',
    slug: 'forex-regulation-explained',
    title: 'Forex Regulation Explained',
    summary: 'Understand what financial regulators do and what a licence does not guarantee.',
    content: '',
    status: 'coming_soon',
    relatedTerms: [],
    sortOrder: 4,
    updatedAt: null,
  },
]

export const GLOSSARY_CONTENT_DEFAULTS: EditorialContentEntry[] = [
  { term: 'Spread', slug: 'spread' },
  { term: 'Leverage', slug: 'leverage' },
  { term: 'Margin', slug: 'margin' },
  { term: 'Pip', slug: 'pip' },
  { term: 'CFD', slug: 'cfd' },
  { term: 'ECN Broker', slug: 'ecn-broker' },
  { term: 'Market Maker', slug: 'market-maker' },
  { term: 'Stop Loss', slug: 'stop-loss' },
  { term: 'Take Profit', slug: 'take-profit' },
  { term: 'Drawdown', slug: 'drawdown' },
].map(({ term, slug }, index) => ({
  id: `default-glossary-${slug}`,
  kind: 'glossary_term',
  slug,
  title: term,
  summary: `Plain-English explanation of ${term} in forex and CFD trading.`,
  content: '',
  status: 'coming_soon',
  metaTitle: `${term} — Forex Glossary | BestForex.io`,
  relatedTerms: [],
  sortOrder: index,
  updatedAt: null,
}))

export const CORRECTIONS_POLICY_DEFAULT: EditorialContentEntry = {
  id: 'default-corrections-policy',
  kind: 'corrections_policy',
  slug: 'policy',
  title: 'Corrections Policy',
  summary: 'How to report an error to BestForex.io and how we issue and timestamp corrections to our articles.',
  content:
    '<h2>Our Commitment</h2><p>We work hard to get things right, but no publisher is infallible. When we make a factual error, we correct it openly and promptly rather than quietly burying it. This page explains how readers can report problems and what happens next.</p><h2>How Corrections Work</h2><ol><li><strong>Report it.</strong> Email editorial@bestforex.io with the article URL, the specific passage you believe is wrong, and any supporting source.</li><li><strong>We review.</strong> An editor checks the claim against the original sources and any new evidence provided.</li><li><strong>We fix and disclose.</strong> If a material error is confirmed, we update the article and add a dated correction note explaining what changed. Minor typos are fixed silently; substantive changes are always disclosed.</li><li><strong>We timestamp.</strong> Corrected articles show an updated modification date, and the correction note records when the change was made.</li></ol><h2>Report an Error</h2><p>Email <a href="mailto:editorial@bestforex.io">editorial@bestforex.io</a> with the article link and the detail you want reviewed, or use our <a href="/contact-us">contact form</a>. For more on how we source and verify our work, see our <a href="/editorial-policy">editorial policy</a>.</p>',
  status: 'published',
  metaTitle: 'Corrections Policy — Reporting & Fixing Errors | BestForex.io',
  metaDescription:
    'How to report an error to BestForex.io and how we issue and timestamp corrections to our articles.',
  relatedTerms: [],
  sortOrder: 0,
  updatedAt: null,
}

export const EDITORIAL_CONTENT_DEFAULTS: EditorialContentEntry[] = [
  ...LEARN_PAGE_DEFAULTS,
  ...GLOSSARY_CONTENT_DEFAULTS,
  CORRECTIONS_POLICY_DEFAULT,
]

export const STATIC_GLOSSARY_TERMS = GLOSSARY_CONTENT_DEFAULTS.map((entry) => ({
  term: entry.title,
  slug: entry.slug,
  comingSoon: true,
}))

export const STATIC_LEARN_GUIDES = LEARN_PAGE_DEFAULTS.filter(
  (entry) => entry.slug !== 'index',
).map((entry) => ({
  title: entry.title,
  slug: entry.slug,
  summary: entry.summary,
  comingSoon: true,
}))

export function mergeEditorialContentDefaults(
  entries: EditorialContentEntry[],
  kind?: EditorialContentEntry['kind'],
): EditorialContentEntry[] {
  const merged = new Map<string, EditorialContentEntry>()

  for (const entry of EDITORIAL_CONTENT_DEFAULTS) {
    if (!kind || entry.kind === kind) {
      merged.set(`${entry.kind}:${entry.slug}`, entry)
    }
  }

  for (const entry of entries) {
    if (!kind || entry.kind === kind) {
      merged.set(`${entry.kind}:${entry.slug}`, entry)
    }
  }

  return [...merged.values()].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.title.localeCompare(b.title) ||
      a.slug.localeCompare(b.slug),
  )
}

export function findEditorialContentDefault(
  kind: EditorialContentEntry['kind'],
  slug: string,
): EditorialContentEntry | undefined {
  return EDITORIAL_CONTENT_DEFAULTS.find(
    (entry) => entry.kind === kind && entry.slug === slug,
  )
}
