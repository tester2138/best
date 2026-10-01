import type { EditorialContentEntry } from '@/lib/editorial-content'

const correctionPolicyHtml = `
  <h2>Our Commitment</h2>
  <p>We work hard to get things right, but no publisher is infallible. When we make a factual error, we correct it openly and promptly rather than quietly burying it. This page explains how readers can report problems and what happens next.</p>
  <h2>How Corrections Work</h2>
  <ol>
    <li><strong>Report it.</strong> Email <a href="mailto:editorial@bestforex.io">editorial@bestforex.io</a> with the article URL, the specific passage you believe is wrong, and any supporting source. The more precise the detail, the faster we can act.</li>
    <li><strong>We review.</strong> An editor checks the claim against the original sources and any new evidence you provide. We aim to acknowledge correction requests promptly and investigate without delay.</li>
    <li><strong>We fix and disclose.</strong> If a material error is confirmed, we update the article and add a dated correction note explaining what changed. Minor typos are fixed silently; substantive changes are always disclosed.</li>
    <li><strong>We timestamp.</strong> Corrected articles show an updated modification date, and the correction note records the date the change was made so the record is transparent.</li>
  </ol>
  <h2>Report an Error</h2>
  <p>Email <a href="mailto:editorial@bestforex.io">editorial@bestforex.io</a> with the article link and the detail you want reviewed, or use our <a href="/contact-us">contact form</a>. For more on how we source and verify our work, see our <a href="/editorial-policy">editorial policy</a>.</p>
`

const guides = [
  { slug: 'what-is-forex-trading', title: 'What is Forex Trading?' },
  { slug: 'how-to-choose-a-forex-broker', title: 'How to Choose a Forex Broker' },
  { slug: 'understanding-leverage-and-margin', title: 'Understanding Leverage and Margin' },
  { slug: 'forex-regulation-explained', title: 'Forex Regulation Explained' },
]

const glossaryTerms = [
  { slug: 'spread', title: 'Spread' },
  { slug: 'leverage', title: 'Leverage' },
  { slug: 'margin', title: 'Margin' },
  { slug: 'pip', title: 'Pip' },
  { slug: 'cfd', title: 'CFD' },
  { slug: 'ecn-broker', title: 'ECN Broker' },
  { slug: 'market-maker', title: 'Market Maker' },
  { slug: 'stop-loss', title: 'Stop Loss' },
  { slug: 'take-profit', title: 'Take Profit' },
  { slug: 'drawdown', title: 'Drawdown' },
]

export const EDITORIAL_CONTENT_DEFAULTS: EditorialContentEntry[] = [
  {
    id: 'static:learn:index',
    kind: 'learn_page',
    slug: 'index',
    title: 'Learn Forex & CFD Trading',
    summary: 'Educational guides and a trading glossary from the BestForex.io editorial team. Content publishing in stages — bookmark this page.',
    content: '',
    status: 'published',
    relatedTerms: [],
    sortOrder: 0,
    updatedAt: null,
  },
  {
    id: 'static:learn:glossary',
    kind: 'learn_page',
    slug: 'glossary',
    title: 'Forex Trading Glossary',
    summary: 'Plain-English definitions for common forex and CFD trading terms. Publishing in stages.',
    content: '',
    status: 'published',
    relatedTerms: [],
    sortOrder: 1,
    updatedAt: null,
  },
  ...guides.map((guide, index): EditorialContentEntry => ({
    id: `static:learn:${guide.slug}`,
    kind: 'learn_page',
    slug: guide.slug,
    title: guide.title,
    summary: '',
    content: '',
    status: 'coming_soon',
    relatedTerms: [],
    sortOrder: 10 + index,
    updatedAt: null,
  })),
  ...glossaryTerms.map((term, index): EditorialContentEntry => ({
    id: `static:glossary:${term.slug}`,
    kind: 'glossary_term',
    slug: term.slug,
    title: term.title,
    summary: '',
    content: '',
    status: 'coming_soon',
    relatedTerms: [],
    sortOrder: index,
    updatedAt: null,
  })),
  {
    id: 'static:corrections:policy',
    kind: 'corrections_policy',
    slug: 'corrections-policy',
    title: 'Corrections Policy',
    summary: 'Accuracy matters. Here is how to flag an error and how we put it right.',
    content: correctionPolicyHtml,
    status: 'published',
    relatedTerms: [],
    sortOrder: 0,
    updatedAt: null,
  },
]

export const STATIC_GLOSSARY_TERMS = glossaryTerms.map(({ title, slug }) => ({
  term: title,
  slug,
  comingSoon: true,
}))

export const STATIC_LEARN_GUIDES = guides.map((guide) => ({
  ...guide,
  comingSoon: true,
}))

export const DEFAULT_CORRECTIONS_POLICY_HTML = correctionPolicyHtml
