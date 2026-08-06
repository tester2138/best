# BestForex.io — Brand Page Research Brief for Claude

You are researching **[BROKER NAME]** for the BestForex.io directory.
Your job is to find 100% accurate, publicly verifiable information and return it
in the exact format described below. Do not guess. If you cannot find a value,
leave the field blank (write `undefined`). Never invent a number, a regulator,
a promotion, or a feature.

---

## STEP 1 — SOURCES TO CHECK (in this order)

1. **Official website** — homepage, accounts page, trading conditions, legal documents
2. **Regulator public registers** (check every jurisdiction claimed):
   - FCA (UK): https://register.fca.org.uk/s/
   - ASIC (AU): https://connectonline.asic.gov.au/
   - CySEC (CY): https://www.cysec.gov.cy/en-GB/entities/investment-firms/cypriot/
   - BaFin (DE): https://www.bafin.de/EN/PublicationsData/Databases/databases_node.html
   - FSCA (ZA): https://www.fsca.co.za/Regulated-Entities
   - DFSA (UAE): https://www.dfsa.ae/Regulated-Entities
   - MFSA (MT): https://www.mfsa.mt/financial-services-register/
   - FSA (SC / Seychelles): https://fsaseychelles.sc/regulated-entities/capital-markets
   - FSC (MU / Mauritius): https://www.fscmauritius.org/en/supervision/register-of-licensees
   - VFSC (VU / Vanuatu): https://www.vfsc.vu/registered-companies/
   - FCA (UK firm search): https://www.fca.org.uk/firms/financial-services-register
3. **Companies House or equivalent** for the legal entity name
4. **Trustpilot** — for customer sentiment only (do not use for scores)
5. **Finance Magnates / Finance Feeds / FX Empire** — cross-check facts only

---

## STEP 2 — FIELDS TO COMPLETE

Return TWO separate blocks: **BROKER OBJECT** and **OFFERS ARRAY**.

### A. BROKER OBJECT

#### Identity

| Field | Format | Min chars | Max chars | Notes |
|---|---|---|---|---|
| `id` | lowercase, hyphens | — | — | Same as slug. e.g. `saxo-bank` |
| `slug` | lowercase, hyphens | — | — | Same as id |
| `name` | Title Case | — | — | Official trading name |
| `legalName` | Exact match | — | — | From regulator register or Companies House |
| `websiteUrl` | Full URL | — | — | No tracking params |
| `affiliateUrl` | Full URL | — | — | Add `?ref=bestforex` at the end |

#### Classification

| Field | Allowed values | Notes |
|---|---|---|
| `entityType` | `forex_broker` / `cfd_broker` / `prop_firm` / `investment_bank` / `exchange` | Retail-facing = forex_broker unless they explicitly call themselves a CFD broker only |
| `verificationStatus` | `verified` | Always use `verified` for completed research |
| `dataQualityStage` | `reviewed` | Always `reviewed` for completed profiles |

#### Descriptions

| Field | Min chars | Max chars | Rules |
|---|---|---|---|
| `shortDescription` | 120 | 200 | One sentence. No adjectives like "leading" or "trusted". State what they do, how many instruments, key regulator. |
| `longDescription` | 600 | 1,000 | Exactly 3 paragraphs, each 2–4 sentences. Paragraph 1: company history + licence. Paragraph 2: platforms + trading conditions + instruments. Paragraph 3: regulation detail + client protection. Plain text, no bullet points, no markdown. |

#### Basics

| Field | Format | Notes |
|---|---|---|
| `foundedYear` | Number e.g. `2010` | From About page or regulator register |
| `headquarters` | `"City, Country"` | e.g. `"London, UK"` |
| `country` | Two-letter ISO code | e.g. `"GB"` |

#### Ratings & Ranking

| Field | Format | Notes |
|---|---|---|
| `rating` | One decimal e.g. `4.6` | Calculated from sub-scores (see Scores below) |
| `ratingLabel` | `"Excellent"` / `"Very Good"` / `"Good"` / `"Average"` / `"Poor"` | 4.5+ = Excellent, 4.0–4.4 = Very Good, 3.5–3.9 = Good |
| `rank` | Integer | Leave as existing value — do not change |

#### Scores (0.0 – 5.0, one decimal)

Score each category honestly using the benchmarks below.
**Overall = average of all 7 sub-scores, rounded to 1 decimal.**

| Sub-score | Field | 5.0 benchmark | 4.0 benchmark |
|---|---|---|---|
| Trust & Safety | `trustSafety` | 3+ Tier-1 regulators (FCA/ASIC/MAS/BaFin), listed company, >20yr history | 1–2 Tier-1 regulators |
| Trading Conditions | `tradingConditions` | Spreads <0.3 pips EUR/USD, leverage >1:30 retail, ECN/STP | Spreads 0.5–1.0 pips |
| Platforms & Tools | `platforms` | Proprietary platform + MT4/5 + TradingView, advanced charting | MT4 or MT5 only |
| Research & Education | `researchEducation` | Daily analysis, webinars, full academy, market news | Weekly analysis or basic articles |
| Customer Service | `customerService` | 24/5 live chat + phone, <2 min response, multiple languages | Email + limited live chat |
| Mobile Trading | `mobileTrading` | Native iOS/Android app, full feature parity with desktop | Basic app, limited features |
| Overall | `overall` | — | — | Average of above 6 |

#### Regulation

| Field | Format | Notes |
|---|---|---|
| `regulators` | Array of strings | e.g. `["FCA (UK)", "ASIC (Australia)", "CySEC (Cyprus)"]` Format: `"AUTHORITY (Country)"` |
| `regulationSummary` | 80–160 chars | One sentence listing key protections: FSCS, ICF, segregated funds, negative balance protection |
| `restrictedCountries` | Array of strings | Countries explicitly blocked on the broker's site e.g. `["USA", "Belgium"]` |

#### Trading Conditions

| Field | Format | Notes |
|---|---|---|
| `instruments` | Array of strings | e.g. `["Forex", "Indices", "Commodities", "Stocks CFDs", "Crypto"]` |
| `currencyPairs` | String e.g. `"70+"` | From their trading conditions page |
| `minDeposit` | String e.g. `"$200"` or `"$0"` | Lowest across all account types |
| `spreadsFrom` | String e.g. `"0.6 pips"` | Lowest advertised, specify EUR/USD if possible |
| `commissions` | String e.g. `"$3.50/lot (ECN)"` or `"Spread only"` | |
| `maxLeverageRetail` | String e.g. `"1:30"` | Per regulatory cap for retail clients |
| `maxLeverageProfessional` | String e.g. `"1:200"` | If applicable |
| `withdrawalTime` | String e.g. `"1–3 business days"` | |
| `inactivityFee` | String e.g. `"$10/month after 3 months"` or `"None"` | |
| `platforms` | Array of strings | e.g. `["MetaTrader 4", "MetaTrader 5", "cTrader", "TradingView"]` |
| `mobileApps` | Array of strings | `["iOS", "Android"]` if both exist |
| `depositMethods` | Array of strings | e.g. `["Bank Wire", "Visa", "Mastercard", "Skrill", "Neteller"]` |
| `withdrawalMethods` | Array of strings | Same format |

#### Account Types (list ALL accounts)

For each account type:

| Field | Format | Notes |
|---|---|---|
| `name` | String | Official account name |
| `minDeposit` | String | e.g. `"$0"` |
| `spreadsFrom` | String | e.g. `"1.2 pips"` |
| `commission` | String | Optional, e.g. `"$5/lot"` |
| `features` | Array, max 3 strings | Max 40 chars each. Most important distinctions only. |

#### Pros & Cons

- **pros**: 4–6 items. Each 40–100 chars. Specific facts only. e.g. "Raw spreads from 0.0 pips on ECN account"
- **cons**: 3–5 items. Each 40–100 chars. Be honest. e.g. "No US clients accepted"

#### Best For & Badges

| Field | Format | Notes |
|---|---|---|
| `bestFor` | Array, 2–4 strings | e.g. `["Scalpers", "ECN Trading", "Beginners"]` |
| `badges` | Array, 2–4 strings | e.g. `["Tight Spreads", "No Min Deposit", "ASIC Regulated"]` Short recognition labels. |

#### SEO Fields

| Field | Min chars | Max chars | Format |
|---|---|---|---|
| `metaTitle` | 55 | 65 | `"[Broker Name] Review 2026 - [One Key Hook] \| BestForex.io"` |
| `metaDescription` | 145 | 160 | Must include broker name, year, 2–3 key facts, call to action. No exclamation marks. |
| `h1` | — | 60 | `"[Broker Name] Review 2026"` |

#### FAQ Schema (for seo.faqSchema)

- Write exactly **3 questions**.
- Question 1: "Is [Broker] regulated?" — Answer: quote the exact licence number if available, 80–180 chars.
- Question 2: "What is the minimum deposit at [Broker]?" — Answer states the amount and account type, 60–140 chars.
- Question 3: A common question specific to that broker (e.g. about their unique feature). Answer 80–160 chars.

#### Metadata

| Field | Format | Notes |
|---|---|---|
| `lastVerifiedAt` | `"YYYY-MM-DD"` | Today's date |
| `isFeatured` | `false` | Do not change unless instructed |
| `isSponsored` | `false` | Do not change unless instructed |

---

### B. OFFERS ARRAY

Only include **currently live promotions** found on the broker's website.
If there are no active offers, return an empty array `[]`.
Do not invent offers. Do not include expired promotions.

For each offer:

| Field | Format | Min | Max | Notes |
|---|---|---|---|---|
| `id` | `"offer-[slug]-1"` | — | — | Increment number for each offer |
| `brokerId` | Same as broker slug | — | — | |
| `brokerName` | Exact broker name | — | — | |
| `title` | String | 10 | 60 | e.g. `"30% Welcome Deposit Bonus"` |
| `description` | String | 60 | 160 | What the offer is. No hype words. Factual. |
| `value` | String | — | 30 | e.g. `"Up to $10,000"` or `"0% commission"` |
| `type` | `"no-deposit"` / `"deposit"` / `"cashback"` / `"rebate"` / `"other"` | — | — | |
| `code` | String or omit | — | 20 | Promo code if one exists |
| `terms` | String | 40 | 180 | Key conditions: minimum deposit, volume requirements, expiry if known. Always end with "T&Cs apply." |
| `affiliateUrl` | Full URL | — | — | Broker's bonus/offers page + `?ref=bestforex` |
| `isFeatured` | `true` / `false` | — | — | `true` if the offer is prominently displayed on their homepage |
| `isExclusive` | `false` | — | — | Always `false` unless instructed |

---

## STEP 3 — OUTPUT FORMAT

Return the output in exactly this structure. No prose. No explanation. Just the two code blocks.

**Block 1 — broker object** (to paste into `data/brokers.ts`):

```ts
{
  id: '...',
  slug: '...',
  name: '...',
  // ... all fields
}
```

**Block 2 — offers array** (to paste into `data/offers.ts`):

```ts
[
  {
    id: 'offer-...-1',
    brokerId: '...',
    // ... all fields
  }
]
```

---

## STEP 4 — INTEGRITY RULES

1. **Never fabricate a regulator.** If the broker claims FCA regulation, verify the firm name matches on https://register.fca.org.uk/s/ before including it.
2. **Never fabricate a rating score.** Use the scoring table above. A broker with only offshore regulation should not score above 3.5 for trustSafety.
3. **Never fabricate an offer.** If you cannot find an active promotion on their site, return `[]` for offers.
4. **Never use AggregateRating schema language** (do not say "X out of 5 based on N reviews"). BestForex.io uses editorial scores only.
5. **Spreads must match the advertised figure on the broker's trading conditions page.** Do not use third-party estimates.
6. **Legal name must match exactly** what appears in the regulator's public register or Companies House equivalent.
7. **Restricted countries must come from the broker's legal disclaimers**, not guessed from region.

---

## STEP 5 — EXAMPLE OF A COMPLETED shortDescription

BAD (too vague, uses hype):
> "Leading forex broker offering excellent trading conditions and top-tier regulation for traders worldwide."

GOOD (specific, factual):
> "ASIC and FCA regulated broker offering ECN execution, raw spreads from 0.0 pips, and access to 1,200+ instruments with no minimum deposit."

BAD shortDescription (too long):
> "Award-winning broker founded in 2010, offering access to forex, commodities, indices, and cryptocurrency CFDs through MetaTrader 4 and MetaTrader 5 with regulation from ASIC and FCA and competitive spreads."

GOOD shortDescription (within 120–200 chars):
> "ASIC and FCA regulated ECN broker with raw spreads from 0.0 pips, 1,200+ instruments, and platforms including MT4, MT5, cTrader, and TradingView."

---

## STEP 6 — EXAMPLE OF A COMPLETED longDescription

Paragraph 1 (history + licence):
> [Broker Name] is a [country]-based [forex/CFD] broker established in [year] and licensed by [full regulator name and licence number if public]. Operating for [X] years, the firm [one sentence on focus or positioning].

Paragraph 2 (platforms + conditions + instruments):
> The broker offers trading on [instrument list] through [platform names]. [One sentence on execution model, e.g. ECN/STP/Market Maker.] [One sentence on spreads, leverage, and key trading condition that differentiates them.]

Paragraph 3 (regulation detail + protection):
> [Broker Name] holds licences from [list regulators with countries]. [One sentence on client fund protection: segregated accounts, negative balance protection, investor compensation.] [Optional: note if US clients are accepted or blocked.]

