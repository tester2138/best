# Article Retrofit Checklist — June 2026 Batch

The 9 articles below were published before 2026-07-01. Each requires the following
editorial retrofits before the article can be considered fully standards-compliant.
Check each box when done.

---

## Retrofit tasks per article

For each article, complete **all** of the following:

- [ ] **Title suffix** — ensure the title ends with `| BestForex.io` (T21 covers this in templates; confirm the stored `metaTitle` also complies)
- [ ] **Editor note block** — verify an italicised editor note / sources paragraph is present at the end of the article body
- [ ] **`og:image` quality** — confirm `featuredImage` is set, and that the image has a sensible alt text (`imageAltText` field)
- [ ] **`linkedSources` field** — add at least one primary source as `{ label, url }` in the `linkedSources` array
- [ ] **Word count** — expand toward 1 200+ words (prose rewrite by Kerem)

---

## Articles in scope (publishedAt < 2026-07-01)

| # | Slug | Published | linkedSources | Words | Done |
|---|------|-----------|:-------------:|:-----:|:----:|
| 1 | `falconx-cftc-fine-unregistered-futures-commission-merchant` | 2026-06-25 | [ ] | [ ] | [ ] |
| 2 | `bluesky-wealth-frank-breuer-lifetime-ban-pension-fraud` | 2026-06-24 | [ ] | [ ] | [ ] |
| 3 | `dinosaur-merchant-bank-fca-fine-cfd-surveillance-failure` | 2026-06-23 | [ ] | [ ] | [ ] |
| 4 | `etoro-ai-agents-grok-autopilot-trading` | 2026-06-17 | [ ] | [ ] | [ ] |
| 5 | `ig-trade-responsibly-3000-free-shares-incentive` | 2026-06-18 | [ ] | [ ] | [ ] |
| 6 | `pepperstone-awards-vs-complaints-offshore-entity` | 2026-06-19 | [ ] | [ ] | [ ] |
| 7 | `plus500-prediction-markets-gamble-regulation` | 2026-06-18 | [ ] | [ ] | [ ] |
| 8 | `fxcm-stratos-jefferies-sale-long-fall` | 2026-06-20 | [ ] | [ ] | [ ] |
| 9 | `saxo-bank-42m-aml-fine-premium-myth` | 2026-06-21 | [ ] | [ ] | [ ] |

> `plus500-buyback-binge-capital-strength-or-illusion` (2026-06-22) also falls in
> this window — add to table if not yet treated.

---

## How to add `linkedSources`

In `data/posts.ts`, on the relevant post object:

```ts
linkedSources: [
  { label: 'CFTC Order — FalconX (2024)', url: 'https://www.cftc.gov/...' },
  { label: 'Finance Magnates reporting', url: 'https://...' },
],
```

The field renders automatically as a numbered Sources list at the foot of every article.
