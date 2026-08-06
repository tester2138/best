import type { DirectoryCompany } from '@/lib/directory-types'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

/**
 * Editorial Review schema for a broker profile (SEO audit #28).
 *
 * We emit a single, honest editorial `Review` authored by BestForex.io with a
 * `reviewRating` derived from our own editorial score. We deliberately DO NOT
 * emit `aggregateRating` with an invented `reviewCount` — fabricating user
 * review counts violates Google's structured-data policies and risks manual
 * action. The reviewed item is modeled as a `FinancialService`.
 */
export function BrokerReviewSchema({ company }: { company: DirectoryCompany }) {
  // Only emit when we have a genuine editorial rating to report.
  if (typeof company.rating !== 'number' || company.rating <= 0) return null

  const url = `${SITE_URL}/brokers/${company.slug}`

  // Review snippet guidelines require a date. Use the broker's last-verified
  // date as the review date, falling back to a stable build constant.
  const reviewDate = company.lastVerifiedAt
    ? new Date(company.lastVerifiedAt).toISOString().split('T')[0]
    : '2026-06-27'

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    '@id': `${url}#review`,
    name: `${company.name} Review`,
    datePublished: reviewDate,
    dateModified: reviewDate,
    // Row 214: itemReviewed must NOT be LocalBusiness or FinancialService (both
    // require a postal address Google cannot verify and will flag). Use
    // Organization with name + url only — fully valid, no address field needed.
    itemReviewed: {
      '@type': 'Organization',
      name: company.name,
      url: company.websiteUrl,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: company.rating,
      bestRating: 5,
      worstRating: 1,
    },
    // Row 221: reference the root Organization node via @id instead of re-declaring
    // a standalone @type:Organization object, which Semrush counted as a duplicate.
    author: { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    ...(company.shortDescription && { reviewBody: company.shortDescription }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
