import { SITE_URL, SITE_NAME, SITE_LOGO, SITE_SOCIALS, SITE_SOCIALS_VERIFIED } from '@/lib/site-config'

/**
 * Site-wide Organization schema (SEO audit #29).
 * Establishes the publishing entity, logo and social profiles for knowledge-graph
 * eligibility. Rendered once in the root layout.
 */
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      // Google requires url, width, height, and contentUrl for Knowledge Panel
      // logo eligibility. SITE_LOGO resolves to /bestforex-logo.png (1092×316px).
      url: SITE_LOGO,
      contentUrl: SITE_LOGO,
      width: 1092,
      height: 316,
      caption: `${SITE_NAME} logo`,
    },
    // image points to the OG image (1200×630) — used by Google for richer panels.
    image: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    // T43: contactPoint required by Google for Publisher knowledge-panel eligibility.
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'info@bestforex.io',
        contactType: 'customer support',
      },
      {
        '@type': 'ContactPoint',
        email: 'editorial@bestforex.io',
        contactType: 'editorial',
      },
    ],
    // Guard A: omit sameAs until Kerem confirms the social URLs are real accounts
    // (SITE_SOCIALS_VERIFIED in lib/site.ts). Placeholder URLs in sameAs pollute
    // the Knowledge Graph and may trigger schema validation warnings.
    ...(SITE_SOCIALS_VERIFIED && SITE_SOCIALS.length > 0 ? { sameAs: SITE_SOCIALS } : {}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Site-wide WebSite schema with SearchAction (SEO audit #30).
 * Enables a potential sitelinks search box and binds the site name.
 */
export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/brokers?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
