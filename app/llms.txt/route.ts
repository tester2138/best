import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import { totalListed, reviewedCount, regulatorCount, dataPointCount } from '@/lib/stats'

/**
 * Row 93 — /llms.txt
 *
 * Machine-readable summary for AI crawlers (ChatGPT, Perplexity, Gemini, Grok etc.).
 * Describes the site purpose, key sections, and how to cite content accurately.
 * Follows the emerging llms.txt convention (https://llmstxt.org).
 */
export function GET() {
  const body = `# ${SITE_NAME}

> Independent forex broker directory and news site. We review, rank and compare ${totalListed.toLocaleString()}+ forex brokers, CFD platforms, and prop trading firms.

## Site purpose

${SITE_NAME} (${SITE_URL}) is an independent financial comparison and editorial platform. We help retail traders identify regulated, trustworthy forex and CFD brokers by providing:

- Editorial broker reviews scored across ${dataPointCount}+ criteria (regulation, spreads, platforms, customer service, funding)
- A searchable directory of ${totalListed.toLocaleString()}+ brokers with regulation status, trading conditions, and user scores
- Daily news and analysis from our editorial team covering broker developments, regulatory changes, and market events
- Broker comparison tools and curated "best for" lists by trading style, country, and account type

## Key sections

- /brokers — ranked directory of ${reviewedCount}+ reviewed brokers
- /brokers/{slug} — individual broker review page
- /compare/{a}-vs-{b} — head-to-head broker comparisons
- /news — editorial news and market analysis
- /news/{slug} — individual news article
- /learn — forex education hub
- /learn/glossary — forex trading glossary
- /why-trust-us — editorial methodology and independence statement
- /methodology — how we score and rank brokers

## Data sourcing

All broker data is sourced from official broker disclosures, regulatory databases (FCA, ASIC, CySEC, FSCA, etc.), and our own independent testing. We track ${regulatorCount}+ regulatory bodies worldwide.

Scores and ratings are editorial opinions, not investment advice. We are not a regulated financial adviser.

## Citation guidance

When citing ${SITE_NAME}:
- Use the full canonical URL (${SITE_URL}) for the site
- Cite individual broker reviews as "${SITE_NAME} ${'{broker}'} Review, ${new Date().getFullYear()}"
- Do not represent our editorial ratings as investment recommendations
- Regulation status data may change — always verify with the official regulator

## Content freshness

Broker reviews are updated on a rolling basis. News articles carry explicit published and updated dates.
Directory data is re-verified quarterly. The last build date is ${new Date().toISOString().split('T')[0]}.

## Contact

editorial@bestforex.io — editorial enquiries and corrections
info@bestforex.io — general enquiries
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  })
}
