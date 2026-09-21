/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // SEO audit #5/#42: image optimization re-enabled (was `unoptimized: true`).
    // Serves responsive AVIF/WebP for better LCP/CLS on image-heavy pages.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'img.logo.dev' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
  async headers() {
    // T48: Security headers applied to all routes.
    // CSP is Report-Only so it never breaks pages; tighten to enforced once
    // policy is validated in production (KEREM-STEP).
    const securityHeaders = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Content-Security-Policy-Report-Only',
        // Permissive baseline — covers next/image, GA, Vercel Analytics, ld+json.
        // KEREM-STEP: narrow default-src and script-src once CSP report endpoint
        // is reviewed in production (look for violations in browser devtools).
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: https: blob:",
          "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    ]

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  async redirects() {
    // ── Row 174: Retired /news/* slugs ────────────────────────────────────────
    // These include both the existing retiredNewsSlugs list AND the ghost URL
    // from row 180 (/news/risk-management-forex-trading → /news).
    // All eight WP currency-news slugs also redirect to /news.
    const retiredNewsSlugs = [
      // Row 180: ghost draft URL (crawled by Google, not in current article set)
      'risk-management-forex-trading',
      // Pre-existing retired slugs (equity-preservation redirects)
      'japanese-yen-outlook',
      'how-to-choose-forex-broker-guide',
      'pepperstone-review-platform-update',
      'best-forex-trading-strategies',
      'gbp-volatility-boe-preview',
      'eur-usd-technical-analysis-weekly',
      'fed-rate-decision-forex-impact',
      // Row 174 / Row 167: old WP currency-news slugs (GSC crawled-not-indexed)
      'eurozone-economic-slowdown-euro-weakens',
      'australian-dollar-strengthens-commodity-price-surge',
      'japanese-yen-weakens-economic-policy-adjustments',
      'chinese-yuan-declines-economic-slowdown-trade-tensions',
      'british-pound-struggles-post-brexit-economic-uncertainty',
      'indian-rupee-continues-decline-economic-challenges',
      'russian-ruble-strengthens-potential-policy-shifts',
      'collapse-weak-dollar-trend-global-markets',
    ]

    return [
      ...retiredNewsSlugs.map((slug) => ({
        source: `/news/${slug}`,
        destination: '/news',
        statusCode: 301,
      })),

      // ── Row 171: HIGHEST-VALUE — singular /broker/:slug WP profile family ────
      // These carry the top GSC impressions (XM: 217, Saxo: 62, Plus500: 44).
      // Two rules: bare slug and slug with trailing sub-path.
      {
        source: '/broker/:slug',
        destination: '/brokers/:slug',
        statusCode: 301,
      },
      {
        source: '/broker/:slug/:path*',
        destination: '/brokers/:slug',
        statusCode: 301,
      },

      // ── Row 174 / Row 114: /best-forex-brokers-for-* weekly roundup family ──
      // These are individual WP date-based slugs; map the entire segment to /brokers.
      {
        source: '/best-forex-brokers-for-:year(\\d{4})-:rest',
        destination: '/brokers',
        statusCode: 301,
      },
      {
        source: '/best-forex-brokers-for-:rest',
        destination: '/brokers',
        statusCode: 301,
      },
      {
        source: '/best-forex-brokers',
        destination: '/brokers',
        statusCode: 301,
      },

      // ── Row 174: WP taxonomy archives ──────────────────────────────────────
      {
        source: '/offer/:path*',
        destination: '/offers',
        statusCode: 301,
      },
      {
        source: '/regulation/:path*',
        destination: '/brokers',
        statusCode: 301,
      },
      {
        source: '/privacy-policy',
        destination: '/privacy',
        statusCode: 301,
      },
      {
        source: '/terms-and-conditions',
        destination: '/terms',
        statusCode: 301,
      },
      {
        source: '/cookie-policy',
        destination: '/privacy',
        statusCode: 301,
      },
      {
        source: '/contact',
        destination: '/contact-us',
        statusCode: 301,
      },
      {
        source: '/bluesuisse-online-trading',
        destination: '/brokers/bluesuisse',
        statusCode: 301,
      },

      // ── SEO audit #37/#38: broker hub renamed /forex-brokers -> /brokers ────
      {
        source: '/forex-brokers',
        destination: '/brokers',
        permanent: true,
      },
      {
        source: '/forex-brokers/:path*',
        destination: '/brokers/:path*',
        permanent: true,
      },

      // ── T12 / Row 174: Legacy WordPress content and utility pages ───────────
      {
        source: '/about-us',
        destination: '/about',
        statusCode: 301,
      },
      {
        source: '/platform/:path*',
        destination: '/brokers',
        statusCode: 301,
      },
      {
        source: '/offers/',
        destination: '/offers',
        statusCode: 301,
      },

      // ── T03: Legacy submission page ──────────────────────────────────────────
      {
        source: '/add-broker',
        destination: '/contact-us?intent=list',
        permanent: true,
      },
      // NOTE: /claim-profile is now a live Broker Portal page (public claim form),
      // so the legacy redirect to /contact-us?intent=claim has been removed.

      // ── /portal/* → /business/* (portal renamed to business) ────────────────
      // Belt-and-suspenders alongside middleware to cover CDN-cached 301s and
      // any requests that bypass middleware (direct API calls, curl, etc.).
      {
        source: '/portal',
        destination: '/business',
        statusCode: 301,
      },
      {
        source: '/portal/:path*',
        destination: '/business/:path*',
        statusCode: 301,
      },

      // ── Author page consolidation ────────────────────────────────────────────
      {
        source: '/authors',
        destination: '/news/author',
        statusCode: 301,
      },
      {
        source: '/authors/:slug',
        destination: '/news/author/:slug',
        statusCode: 301,
      },

      // ── P1-263: Non-ASCII tag slugs — euro-symbol redirect-loop fix ────────
      // The old slug generator preserved € producing /news/tag/%E2%82%AC42m-penalty
      // which then 301-looped to itself. Map the percent-encoded euro variant to
      // the clean ASCII slug in ONE hop so no further redirect occurs.
      {
        source: '/news/tag/%E2%82%AC42m-penalty',
        destination: '/news/tag/42m-penalty',
        statusCode: 301,
      },
      // Belt-and-suspenders: also handle if Next.js decoded the % to the raw symbol.
      {
        source: '/news/tag/\u20AC42m-penalty',
        destination: '/news/tag/42m-penalty',
        statusCode: 301,
      },

      // ── Legacy root-level brand URLs shared with customers ──────────────────
      // These were sent as direct links; 301 to canonical /brokers/{slug}.
      { source: '/naga',             destination: '/brokers/naga',             statusCode: 301 },
      { source: '/doo-prime',        destination: '/brokers/doo-prime',        statusCode: 301 },
      { source: '/blackbull-markets',destination: '/brokers/blackbull-markets',statusCode: 301 },
      { source: '/gerchik-co',       destination: '/brokers/gerchik-co',       statusCode: 301 },
      { source: '/fbs',              destination: '/brokers/fbs',              statusCode: 301 },
      { source: '/fxopen',           destination: '/brokers/fxopen',           statusCode: 301 },
      { source: '/doto',             destination: '/brokers/doto',             statusCode: 301 },
    ]
  },
}

export default nextConfig
