# BestForex.io — Brand Page Research Brief for Claude

**Purpose:** Complete the broker profile entry in `data/brokers.ts` and any matching offer entries in `data/offers.ts` for one broker at a time. Research online thoroughly. All information must be 100% accurate and sourced from the broker's own website, regulator registers, and credible third-party sources. Never fabricate data.

---

## 0. How to use this brief

1. Replace `[BROKER_NAME]` with the target broker throughout.
2. Research the broker online — official site, regulator registers, review sites, press releases.
3. Produce the completed TypeScript object(s) as specified below.
4. Return only the TypeScript object(s) — no surrounding prose, no imports, no export statements. The human will paste it into the correct file.

---

## 1. Output you must return

### A. One `Broker` object for `data/brokers.ts`

Return an object literal that fits exactly inside the `brokers` array. Match the structure below precisely — every field, every type. Do not add or remove fields.

```ts
{
  // --- Identity ---
  id: 'slug-here',                         // lowercase, hyphens, matches slug
  slug: 'slug-here',                       // kebab-case broker name
  name: '[BROKER_NAME]',
  legalName: 'Full Legal Entity Name Ltd', // from Companies House / regulator register
  logoUrl: '/logos/brokers/slug-here.png', // keep this exact pattern
  websiteUrl: 'https://www.broker.com',    // no trailing slash, https
  affiliateUrl: 'https://www.broker.com/?ref=bestforex', // append ?ref=bestforex

  // --- Rankings ---
  rank: null,          // leave null — assigned by the editor
  rating: 4.5,         // your editorial score 1.0–5.0, one decimal place
  ratingLabel: 'Great',// Excellent (4.8+), Great (4.4–4.7), Good (4.0–4.3), Average (<4.0)

  // --- Descriptions ---
  // shortDescription: 120–200 chars. One sentence. No hype. No "is a leading broker".
  // Must include: regulator name, key differentiator, headline number (instruments, pairs, etc).
  shortDescription: '',

  // longDescription: 3 paragraphs, 400–800 words total.
  // Para 1: What the broker is, who it serves, founding year, key strengths (2–3 sentences).
  // Para 2: Products, platforms, instrument count (specific numbers), execution model.
  // Para 3: Regulation, safety, client fund protection, negative balance protection if applicable.
  // Plain text only. No markdown in this field. No promotional language.
  longDescription: ``,

  foundedYear: 2010,       // 4-digit integer — from regulator filings or About page
  headquarters: 'City, Country', // city + country

  // --- Classification tags (3–5 items each, title case) ---
  bestFor: ['Retail Traders', 'MT4 Users', 'Low Spreads'],
  badges: ['FCA Regulated', 'Raw Spreads', 'ECN Broker'],

  // --- Regulation ---
  // Exact regulator names from official registers. Common formats:
  // 'FCA (UK)', 'CySEC (Cyprus)', 'ASIC (Australia)', 'FSCA (South Africa)',
  // 'FSA (Seychelles)', 'FSC (Mauritius)', 'FSC (BVI)', 'SCB (The Bahamas)',
  // 'MAS (Singapore)', 'DFSA (Dubai)', 'BaFin (Germany)', 'AMF (France)'
  regulators: ['FCA (UK)', 'CySEC (Cyprus)'],

  // --- Geography ---
  countriesServed: [],     // omit or leave empty if unknown
  restrictedCountries: ['USA', 'Iran', 'North Korea'], // always verify from their legal page

  // --- Platforms ---
  // Exact product names as the broker uses them.
  // Common values: 'MetaTrader 4', 'MetaTrader 5', 'cTrader', 'TradingView',
  // 'DXtrade', 'Match-Trader', 'Proprietary web platform', 'Proprietary mobile app'
  platforms: ['MetaTrader 4', 'MetaTrader 5'],
  mobileApps: ['iOS', 'Android'], // or [] if no mobile app

  // --- Account types ---
  // List actual account tiers from the broker site. Max 6.
  // spreadsFrom format: '1.0 pips', '0.0 pips + commission', 'Variable'
  accountTypes: [
    { name: 'Standard', minDeposit: '$100', spreadsFrom: '1.0 pips' },
    { name: 'ECN',      minDeposit: '$200', spreadsFrom: '0.0 pips', commission: '$7/lot' },
  ],

  // --- Trading conditions ---
  instruments: ['Forex', 'Indices', 'Commodities', 'Crypto CFDs'],
  currencyPairs: '70+',            // specific number from broker site
  minDeposit: '$100',              // lowest account minimum
  spreadsFrom: '0.6 pips',        // lowest advertised spread (EUR/USD or stated)
  commissions: 'From $6/lot',     // or 'Included in spread' for spread-only accounts
  maxLeverageRetail: '1:30',       // regulated retail max — from their site or regulator
  maxLeverageProfessional: '1:500',// pro account max; omit field if not offered

  // --- Payments ---
  depositMethods: ['Bank Wire', 'Visa', 'MasterCard', 'Skrill', 'Neteller'],
  withdrawalMethods: ['Bank Wire', 'Visa', 'MasterCard', 'Skrill', 'Neteller'],
  withdrawalTime: '1-3 business days',
  inactivityFee: 'None', // or e.g. '$10/month after 90 days'

  // --- Bonuses (in the Broker object) ---
  // Only include bonuses that are currently live on the broker site.
  // If no active bonuses, use [].
  bonuses: [],

  // --- Editorial ---
  // pros: 4–7 items. Each item 40–120 chars. Factual, specific. No superlatives.
  pros: [
    'FCA and CySEC regulated with segregated client funds',
    'Raw ECN spreads from 0.0 pips on major pairs',
    'Wide instrument range — 1,000+ CFDs including forex, indices, commodities',
  ],

  // cons: 2–5 items. Must include at least one genuine negative. No softening.
  // Bad example: "Limited research for advanced traders" — this is not a real con.
  // Good example: "Inactivity fee of $10/month after 90 days"
  cons: [
    'No negative balance protection outside EU',
    '$10/month inactivity fee after 90 days',
    'Customer service response can be slow on weekends',
  ],

  // scores: all values 1.0–5.0, one decimal place.
  // Base them on your research. Be honest — a mediocre broker does not get 4.9.
  scores: {
    overall: 4.3,
    trustSafety: 4.5,       // regulation tier, fund segregation, track record
    tradingConditions: 4.2, // spreads, commissions, leverage, slippage
    platforms: 4.0,         // platform quality, features, stability
    researchEducation: 3.8, // analysis tools, education resources
    customerService: 4.1,   // support channels, hours, responsiveness
    mobileTrading: 4.0,     // app quality, features, ratings
  },

  // --- SEO ---
  seo: {
    // metaTitle: 55–65 chars. Format: "[Name] Review [Year] - [Hook] | BestForex.io"
    metaTitle: '[BROKER_NAME] Review 2026 - [Hook] | BestForex.io',

    // metaDescription: 145–160 chars. Include broker name, year, 2–3 key facts,
    // and a soft call to action. No keyword stuffing. No exclamation marks.
    metaDescription: 'Complete [BROKER_NAME] review 2026. [Regulator], [key feature], [key feature]. Find out if [BROKER_NAME] is right for you.',

    // h1: "[Name] Review [Year]" — simple, never change this pattern.
    h1: '[BROKER_NAME] Review 2026',

    // faqSchema: 3–5 questions. Naturally phrased, real user questions.
    // Answers: 1–3 sentences, factual, include the broker name in the answer.
    faqSchema: [
      {
        question: 'Is [BROKER_NAME] regulated?',
        answer: 'Yes, [BROKER_NAME] is regulated by [regulator] under license number [X].',
      },
      {
        question: 'What is the minimum deposit at [BROKER_NAME]?',
        answer: '[BROKER_NAME] requires a minimum deposit of $X for the [account name] account.',
      },
      {
        question: 'Is [BROKER_NAME] safe?',
        answer: '[BROKER_NAME] holds client funds in segregated accounts and is regulated by [regulator]. [Add one more safety fact].',
      },
    ],
  },

  // --- Metadata ---
  lastVerifiedAt: '2026-07-10', // today's ISO date
  isFeatured: false,             // leave false unless instructed otherwise
  isSponsored: false,            // leave false unless instructed otherwise
}
```

---

### B. Offer entries for `data/offers.ts` (if any active offers exist)

Research the broker's current promotions page. For each active offer return an object:

```ts
{
  id: 'offer-slug-1',           // format: 'offer-[broker-slug]-[number]'
  brokerId: 'slug-here',        // must match the broker object's id
  brokerName: '[BROKER_NAME]',
  brokerLogo: '/logos/brokers/slug-here.png',

  // title: 40–80 chars. Factual. No exclamation marks.
  title: '50% Welcome Deposit Bonus',

  // description: 80–160 chars. What the offer is, who qualifies.
  description: 'Receive a 50% bonus on your first deposit up to $5,000. Available to new retail clients.',

  // value: concise. E.g. 'Up to $5,000', '$30', '20%', '1.0 pip cashback'
  value: 'Up to $5,000',

  code: 'WELCOME50',   // omit field entirely if no promo code

  // type: 'deposit' | 'no-deposit' | 'cashback' | 'rebate' | 'other'
  type: 'deposit',

  expiresAt: '2026-12-31', // ISO date if shown; omit field if no expiry

  // terms: 80–200 chars. Key conditions only. End with "T&Cs apply."
  terms: 'New clients only. Min deposit $500. 30x volume requirement before withdrawal. T&Cs apply.',

  affiliateUrl: 'https://www.broker.com/bonus/?ref=bestforex',

  isFeatured: true,   // true if it is the broker's main/headline offer
  isExclusive: false, // true only if confirmed exclusive to BestForex.io
}
```

If the broker has no active offers, return `[]` for the offers array.

---

## 2. Character limits reference

| Field | Min | Max | Notes |
|---|---|---|---|
| `shortDescription` | 120 | 200 | One sentence, no hype |
| `longDescription` | 400 words | 800 words | 3 paragraphs, plain text |
| `pros` items | 40 | 120 | Factual, specific |
| `cons` items | 30 | 120 | Real negatives only |
| `seo.metaTitle` | 55 | 65 | Year must be current |
| `seo.metaDescription` | 145 | 160 | No keyword stuffing |
| `seo.h1` | — | — | Always "[Name] Review 2026" |
| `faqSchema` answers | 1 sentence | 3 sentences | Include broker name |
| Offer `title` | 40 | 80 | No exclamation marks |
| Offer `description` | 80 | 160 | Who qualifies, what they get |
| Offer `terms` | 80 | 200 | End with "T&Cs apply." |

---

## 3. Rating scoring guide

Score every sub-category honestly based on research:

| Sub-score | What to assess |
|---|---|
| `trustSafety` | Regulator tier (FCA/ASIC/CySEC = top), licence age, track record, segregated funds, ICF/FSCS coverage |
| `tradingConditions` | EUR/USD spread, commission per lot, swap rates, slippage, execution model (STP/ECN/MM) |
| `platforms` | Number of platforms, feature depth, reliability, charting tools, EA support |
| `researchEducation` | Daily analysis, webinars, trading signals, education library depth |
| `customerService` | Support hours (24/5 vs 24/7 vs office hours), channels (live chat scores higher), languages |
| `mobileTrading` | App store ratings, feature parity with desktop, stability |
| `overall` | Weighted average — trust and conditions carry most weight |

**Benchmarks (use these as anchor points):**
- 5.0: Near-perfect in category (e.g. FCA + ASIC + MiFID II + FSCS coverage = 5.0 trust)
- 4.5–4.9: Excellent, minor gaps
- 4.0–4.4: Good, some notable weaknesses
- 3.5–3.9: Average, clear issues
- below 3.5: Poor — flag clearly in cons

---

## 4. Strict accuracy rules

1. **Regulation:** Always verify licence numbers directly on the regulator's public register (FCA Register, ASIC Connect, CySEC register). If you cannot confirm a licence, list `regulators: []` and note it in a `con`.
2. **Spreads:** Use the broker's own advertised spread on EUR/USD. If they show a range (0.0–1.2 pips), use the from value.
3. **Restricted countries:** Check the broker's Terms & Conditions or Legal page. USA is restricted for most offshore brokers.
4. **No fabrication:** If information is genuinely unavailable after research, leave the field as an empty string `''` or empty array `[]`, never invent a value.
5. **No AggregateRating schema:** Do not include reviewCount or aggregate rating data in faqSchema answers. Scores are editorial only.
6. **Bonuses:** Only list bonuses that appear on the broker's live promotions page. Do not list expired or unverified promotions.
7. **legalName:** Must come from the broker's legal documents, regulator register filing, or Companies House equivalent — not their marketing site.

---

## 5. Common pitfalls to avoid

- Do not write `shortDescription` starting with the broker name ("XM is..."). Start with a descriptor ("Award-winning...", "CySEC-regulated...", "One of the...").
- Do not use superlatives: "best", "leading", "number one", "world-class". Use specifics instead.
- Do not include the year in `longDescription` — it dates quickly.
- Do not list the same item in both `pros` and something softened in `cons`.
- `platforms` array must use the exact canonical names listed in section 1 (e.g. "MetaTrader 4" not "MT4", "cTrader" not "Ctrader").
- `maxLeverageRetail` must be the regulated retail cap for the broker's primary EU/UK/AU entity. Use the offshore cap for `maxLeverageProfessional`.
- `commissions` format: "From $X/lot" or "Included in spread" — never a percentage.
- Offer `affiliateUrl`: always append `?ref=bestforex` or `&ref=bestforex` depending on existing query string.

---

## 6. Slot in the array

After producing the object, specify where it should be inserted:
- "Insert after `[last broker slug in the file]`" — or —
- "Insert as the Nth entry (replacing the existing stub for [broker slug])"

If there is already an entry for this broker in the file (even a stub), the output should be the full replacement object, not an addition.
