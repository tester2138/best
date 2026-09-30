import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ExternalLink, Shield, Award, Calendar, Building, Globe, Check, AlertTriangle, Clock, DollarSign, Percent, TrendingDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { RatingStars } from '@/components/ui/rating-stars'
import { BrokerLogo } from '@/components/brokers/broker-logo'
import { BrokerScoreBreakdown } from '@/components/brokers/broker-score-breakdown'
import { BrokerQuickFacts } from '@/components/brokers/broker-quick-facts'
import { BrokerProsCons } from '@/components/brokers/broker-pros-cons'
import { BrokerCard } from '@/components/brokers/broker-card'
import { OutLink } from '@/components/ui/out-link'
import { VerificationBadge } from '@/components/brands/verification-badge'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { AdSlot } from '@/components/ads/ad-slot'
import { directoryCompanies, searchDirectory } from '@/data/directory'
import { brokers } from '@/data/brokers'
import { applyAdminProfileOverridesToSections } from '@/lib/admin-overrides'
import {
  directoryCompanyToBroker,
  getPublicAdminProfileOverridesBySlug,
  getPublicBrokerBySlug,
  getPublicCompanyBySlug,
  getPublicDirectoryCompanies,
  getPublicTopBrokers,
} from '@/lib/public-brokers'
import { getOffersByBroker } from '@/data/offers'
import { getPostsByBrokerSlug } from '@/data/posts'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { SITE_URL } from '@/lib/site-config'
import { isIndexableBroker } from '@/lib/seo'
import { isRetailEntityType } from '@/lib/directory-types'
import { BrokerReviewSchema } from '@/components/seo/broker-schema'
import { getClaimedData } from '@/lib/claimed'
import { ClaimedBadge } from '@/components/public/claimed-badge'
import { OffersRail } from '@/components/public/offers-rail'
import { getPublicSections } from '@/lib/public-sections'

interface PageProps {
  params: Promise<{ brokerSlug: string }>
}

// Scheduling: re-render hourly so the "Related Coverage" section reveals a
// scheduled article about this broker on its publish date.
export const revalidate = 3600

// Generate static params for all companies in directory
export async function generateStaticParams() {
  return directoryCompanies.map((company) => ({
    brokerSlug: company.slug
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brokerSlug } = await params
  const company = await getPublicCompanyBySlug(brokerSlug)
  
  if (!company) {
    return { title: 'Company Not Found' }
  }

  const isPropFirm = company.category === 'prop-firm'
  // Row 217: shorter template so title stays within ~60-char display limit on SERP.
  // The brand suffix is appended by the root template; the absolute: wrapper below
  // prevents double-suffixing. Reviewed profiles usually have a custom seo.metaTitle.
  const defaultTitle = isPropFirm
    ? `${company.name} Review | Prop Firm Profile`
    : `${company.name} Review | Forex Broker Profile`
  
  const defaultDescription = company.shortDescription || `Read our ${company.name} review. ${isPropFirm ? 'Prop trading firm' : 'Forex broker'} profile with trading conditions, platforms, and more.`

  const canonical = `${SITE_URL}/brokers/${company.slug}`
  const indexable = isIndexableBroker(company)

  // Some stored seo.metaTitle values already include the "| BestForex.io" brand
  // suffix. Strip it and use an absolute title so the root template
  // ("%s | BestForex.io") doesn't append the brand a second time (audit #18).
  const rawTitle = company.seo?.metaTitle || defaultTitle
  const pageTitle = rawTitle.replace(/\s*\|\s*BestForex\.io\s*$/i, '')
  const description = company.seo?.metaDescription || defaultDescription

  return {
    title: { absolute: `${pageTitle} | BestForex.io` },
    description,
    alternates: { canonical },
    // Thin "basic" profiles (name/logo/website only) are kept out of the index
    // to protect overall site quality; they stay crawlable for discovery.
    // Reviewed/enriched profiles get explicit positive directives (T14).
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        }
      : { index: false, follow: true },
    openGraph: {
      title: pageTitle,
      description,
      url: canonical,
      type: 'website',
      // T17: per-broker dynamic OG image generated by opengraph-image.tsx in
      // this route segment. Next.js resolves it automatically from the file
      // convention; we also set it explicitly for twitter so both use the same.
      images: [{ url: `${SITE_URL}/brokers/${company.slug}/opengraph-image`, width: 1200, height: 630, alt: `${company.name} review by BestForex.io` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [`${SITE_URL}/brokers/${company.slug}/opengraph-image`],
    },
  }
}

const categoryLabels: Record<string, string> = {
  'forex-broker': 'Forex Broker',
  'cfd-broker': 'CFD Broker',
  'prop-firm': 'Prop Trading Firm',
  'crypto-exchange': 'Crypto Exchange',
  'multi-asset': 'Multi-Asset Broker',
}

export default async function BrokerDetailPage({ params }: PageProps) {
  const { brokerSlug } = await params

  // Canonical slugs are always lowercase. If the URL contains any uppercase
  // characters (e.g. /brokers/Plus500), issue a 301 to the lowercase version
  // so a single canonical URL is served and indexed.
  const normalisedSlug = brokerSlug.toLowerCase()
  if (normalisedSlug !== brokerSlug) {
    permanentRedirect(`/brokers/${normalisedSlug}`)
  }

  const [company, legacyBroker, publicDirectory, adminProfileOverrides] = await Promise.all([
    getPublicCompanyBySlug(normalisedSlug),
    getPublicBrokerBySlug(normalisedSlug),
    getPublicDirectoryCompanies(),
    getPublicAdminProfileOverridesBySlug(normalisedSlug),
  ])

  if (!company && !legacyBroker) {
    notFound()
  }

  // ── Broker Portal overlay (Blueprint Section 15.3) ──────────────────────────
  // Load published portal content for this slug. Returns null unless the brand
  // is actively claimed, in which case the page renders exactly as before.
  // Also load public_broker_sections for all brands (bulk-imported editorial data).
  const [claimed, publicSections] = await Promise.all([
    getClaimedData(normalisedSlug),
    getPublicSections(normalisedSlug),
  ])

  // Claimed brand sections take precedence over bulk-imported sections; explicit
  // admin profile values are layered last so they remain authoritative.
  const merchantSections = Object.keys(claimed?.sections ?? {}).length > 0
    ? (claimed!.sections as typeof publicSections)
    : publicSections
  const activeSections = applyAdminProfileOverridesToSections(
    merchantSections as Record<string, unknown> | null,
    adminProfileOverrides,
    (company ?? legacyBroker ?? {}) as unknown as Record<string, unknown>,
  ) as typeof publicSections

  const heroSection = activeSections?.hero as
    | { short_description?: string; founded_year?: number; hq_city?: string; tagline?: string }
    | undefined
  const prosConsSection = activeSections?.pros_cons as
    | { pros?: string[]; cons?: string[] }
    | undefined
  const faqSection = activeSections?.faq as
    | { items?: Array<{ q: string; a: string }> }
    | undefined
  const regulationSection = activeSections?.regulation as
    | { regulators?: string[]; client_money?: string; compensation_scheme?: string; body?: string; admin_summary?: string }
    | undefined
  const aboutSection = activeSections?.about as
    | { body?: string }
    | undefined
  const keyFactsSection = activeSections?.key_facts as
    | {
        min_deposit_amount?: number
        min_deposit_currency?: string
        max_leverage?: string
        spreads_from?: string
        platforms?: string[]
        instruments?: string[]
        deposit_methods?: string[]
      }
    | undefined
  const tradingConditionsSection = activeSections?.trading_conditions as
    | { account_types?: Array<{ name: string; min_deposit?: string; spreads_from?: string; commission?: string }> }
    | undefined

  // Prefer the brand-published short description over the editorial default.
  const overlayShortDescription =
    heroSection?.short_description || company?.shortDescription || 'Profile information is being compiled.'

  // Use company data primarily, fall back to legacy broker data
  const isPropFirm = company?.category === 'prop-firm'
  const categoryLabel = company ? categoryLabels[company.category] || company.category : 'Forex Broker'
  
  // Get offers if available
  const brokerOffers = company?.id ? getOffersByBroker(company.id) : []
  
  // Rows 215+25: filter alternatives to SAME category AND same entityType bucket
  // (retail only). This prevents exchanges, hedge funds, investment banks and
  // clearing houses from appearing as alternatives on prop firm or broker profiles.
  const companyEntityType = company?.entityType
  const alternatives = searchDirectory(undefined, { category: company?.category }, 'rating', 'desc', publicDirectory)
    .filter(c => {
      if (c.id === company?.id) return false
      // Must be a retail entity type (forex_broker, cfd_broker, prop_firm).
      if (!isRetailEntityType(c.entityType)) return false
      // Must share the same entityType bucket as the current profile so a prop
      // firm page doesn't recommend forex brokers and vice-versa.
      if (companyEntityType && c.entityType && c.entityType !== companyEntityType) return false
      return true
    })
    .sort((a, b) => {
      // Sort alternatives: Sponsored first, then Verified, then Unverified — by rating within tier
      const tierOf = (c: typeof a) => {
        if (c.isSponsored || c.verificationStatus === 'sponsored') return 0
        if (c.verificationStatus === 'verified' || c.verificationStatus === 'claimed') return 1
        return 2
      }
      const tierDiff = tierOf(a) - tierOf(b)
      if (tierDiff !== 0) return tierDiff
      return (b.rating ?? 0) - (a.rating ?? 0)
    })
    .slice(0, 3)

  // Top 10 brokers for sidebar widget
  const top10Brokers = await getPublicTopBrokers(10)

  // T22: breadcrumb first crumb derives from entity category so prop firms
  // render "Prop Firms > {Name}" rather than "Forex Brokers > {Name}".
  const categoryBreadcrumbLabel = isPropFirm ? 'Prop Firms' : 'Forex Brokers'

  const breadcrumbItems = [
    { label: categoryBreadcrumbLabel, href: '/brokers' },
    { label: company?.name || legacyBroker?.name || 'Profile' }
  ]

  // T51: merge seo.faqSchema (broker type) and faqItems (directory type) into
  // one unified list. faqItems takes precedence when both are present.
  const unifiedFaqs = [
    ...(company?.faqItems ?? []),
    ...(company?.seo?.faqSchema ?? []),
  ]
  const faqSchema = unifiedFaqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: unifiedFaqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  } : null

  // T50: related news coverage for this broker
  const relatedPosts = company ? await getPostsByBrokerSlug(company.slug) : []

  // Determine if profile has minimal data (under review)
  const isMinimalProfile = company?.dataQualityStage === 'basic' || company?.dataQualityStage === 'enriched'

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      {/* Row 220: only emit Review schema for editorially reviewed profiles.
          Unreviewed entities (dataQualityStage basic/enriched) carry fake 1.0 scores
          and must not assert a Review in structured data. */}
      {company && company.dataQualityStage === 'reviewed' && <BrokerReviewSchema company={company} />}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      {/* Under Review Notice */}
      {isMinimalProfile && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3 text-amber-800">
              <Clock className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                This profile is currently being reviewed by the BestForex.io editorial team. 
                Some information may be incomplete or subject to change.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-secondary/30 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Main Info */}
            <div className="lg:col-span-2">
              <div className="flex items-start gap-5">
                {/* Logo — Logo.dev resolves the real brand logo from websiteUrl automatically */}
                <BrokerLogo
                  name={company?.name || legacyBroker?.name || 'Broker'}
                  slug={company?.slug || legacyBroker?.slug || ''}
                  logoUrl={company?.logoUrl}
                  websiteUrl={company?.websiteUrl}
                  size="xl"
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-3xl font-bold text-foreground text-balance">
                      {company?.seo?.h1 || `${company?.name || legacyBroker?.name} Review`}
                    </h1>
                    {company && (
                      <VerificationBadge
                        verificationStatus={company.verificationStatus ?? 'unverified'}
                        isSponsored={company.isSponsored}
                        display="pill"
                      />
                    )}
                  </div>
                  
                  {/* Category and country */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="outline">{categoryLabel}</Badge>
                    {company?.country && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        {company.country}
                      </span>
                    )}
                  </div>
                  
                  {/* Rating */}
                  {company?.rating && company.dataQualityStage === 'reviewed' && (
                    <div className="flex items-center gap-4 mb-4 flex-wrap">
                      <RatingStars rating={company.rating} size="lg" showLabel label={company.ratingLabel} />
                      {company.rank && (
                        <Badge className="bg-success/10 text-success border-0">
                          <Award className="w-3.5 h-3.5 mr-1" />
                          #{company.rank} Ranked
                        </Badge>
                      )}
                      {/* Row 118: transparent link to scoring criteria beside the score. */}
                      <Link
                        href="/methodology"
                        className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
                      >
                        How we rate
                      </Link>
                    </div>
                  )}

                  <p className="text-muted-foreground mb-4 text-pretty leading-relaxed">
                    {overlayShortDescription}
                  </p>

                  {claimed && claimed.brand.portal_access === 'active' && (
                    <div className="mb-4">
                      <ClaimedBadge
                        brandName={claimed.brand.name}
                        lastPublishedAt={claimed.lastPublishedAt}
                      />
                    </div>
                  )}

                  {company?.badges && company.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {company.badges.map((badge) => (
                        <Badge key={badge} variant="secondary">{badge}</Badge>
                      ))}
                    </div>
                  )}

                  {/* T52: Reviewer byline + review/update dates */}
                  {(company?.reviewerName || company?.reviewDate || company?.updateDate) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground border-t border-border pt-3">
                      {company.reviewerName && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Reviewed by <strong className="text-foreground ml-1">{company.reviewerName}</strong>
                        </span>
                      )}
                      {company.reviewDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Published {formatDate(new Date(company.reviewDate))}
                        </span>
                      )}
                      {company.updateDate && (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />
                          Updated {formatDate(new Date(company.updateDate))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Key Highlights - Different for Prop Firms */}
              {isPropFirm && company?.propFirmDetails ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 items-stretch">
                  {[
                    { icon: DollarSign, label: 'Account Sizes', value: company.propFirmDetails.accountSizes ? company.propFirmDetails.accountSizes.slice(0, 2).join(', ') : 'Various' },
                    { icon: Percent, label: 'Profit Split', value: company.propFirmDetails.profitSplit || 'Up to 90%' },
                    { icon: TrendingDown, label: 'Max Drawdown', value: company.propFirmDetails.maximumDrawdown || '10%' },
                    { icon: RefreshCw, label: 'Payout', value: company.propFirmDetails.payoutFrequency || 'Bi-weekly' }
                  ].map((item) => (
                    <div key={item.label} className="bg-card rounded-xl p-4 border border-border h-full flex flex-col justify-between gap-1">
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon className="w-4 h-4 text-primary flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                      </div>
                      <p className="text-lg font-semibold text-foreground tabular-nums truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 items-stretch">
                  {[
                    {
                      label: 'Min Deposit',
                      value: company?.minDeposit
                        || (keyFactsSection?.min_deposit_amount != null
                          ? `${keyFactsSection.min_deposit_currency === 'GBP' ? '£' : keyFactsSection.min_deposit_currency === 'EUR' ? '€' : '$'}${keyFactsSection.min_deposit_amount}`
                          : null)
                        || 'N/A'
                    },
                    {
                      label: 'Spreads From',
                      value: company?.spreadsFrom || keyFactsSection?.spreads_from || 'N/A'
                    },
                    {
                      label: 'Max Leverage',
                      value: company?.maxLeverageRetail || keyFactsSection?.max_leverage || 'N/A'
                    },
                    {
                      label: 'Platforms',
                      value: company?.platforms?.length
                        ? company.platforms.length.toString()
                        : keyFactsSection?.platforms?.length
                          ? keyFactsSection.platforms.slice(0, 2).join(', ')
                          : 'N/A'
                    },
                  ].map((item) => (
                    <div key={item.label} className="bg-card rounded-xl p-4 border border-border h-full flex flex-col justify-between gap-1">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-semibold text-foreground tabular-nums truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 border-primary/20">
                <CardContent className="p-6">
                  {/* Row 43: numeric score only when editorially reviewed — no 1.0/1.1 fabrication. */}
                  {company?.rating && company.dataQualityStage === 'reviewed' && (
                    <div className="text-center mb-6">
                      <p className="text-sm text-muted-foreground mb-1">Overall Rating</p>
                      <p className="text-5xl font-bold text-foreground">{company.rating}</p>
                      <RatingStars rating={company.rating} size="md" showValue={false} className="justify-center mt-2" />
                      <p className="text-sm text-success font-medium mt-1">{company.ratingLabel}</p>
                    </div>
                  )}

                  {/* Row 156: affiliate CTA only when broker meets minimum quality bar.
                      Gate: reviewed OR rating >= AFFILIATE_MIN_RATING (3.0).
                      Row 207: when affiliateUrl is null/undefined, NO CTA — never
                      fall back to a plain website link in the CTA position. */}
                  {(() => {
                    const AFFILIATE_MIN_RATING = 3.0
                    const isQualified =
                      company?.dataQualityStage === 'reviewed' ||
                      (company?.rating != null && company.rating >= AFFILIATE_MIN_RATING)
                    if (!isQualified) return null
                    if (company?.affiliateUrl) {
                      return (
                        <OutLink href={company.affiliateUrl} sponsored className="block">
                          <Button className="w-full gap-2 bg-primary hover:bg-primary/90 text-base py-6">
                            Visit {company.name}
                            <ExternalLink className="w-5 h-5" />
                          </Button>
                        </OutLink>
                      )
                    }
                    // Row 207: no affiliateUrl — show nothing (no fallback to websiteUrl in CTA).
                    return null
                  })()}

                  {company?.regulators && company.regulators[0] && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      <span className="flex items-center justify-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        Regulated by {company.regulators[0]}
                      </span>
                    </p>
                  )}

                  {/* Risk Warning */}
                  {!isPropFirm && (
                    <div className="mt-4 p-3 bg-warning/10 rounded-lg">
                      <p className="text-xs text-warning-foreground flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        CFDs are complex instruments with high risk of losing money. Retail accounts lose money trading CFDs.
                      </p>
                    </div>
                  )}

                  {/* Claim Profile CTA — unclaimed pages only (Blueprint 15.4) */}
                  {!claimed && (
                    <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
                      <p className="text-sm font-medium text-foreground mb-1">Is this your company?</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Claim this profile to update your information, add offers or request featured placement.
                      </p>
                      <Link
                        href={`/claim-profile?slug=${normalisedSlug}&name=${encodeURIComponent(company?.name ?? normalisedSlug)}`}
                      >
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Building className="w-4 h-4" />
                          Claim This Profile
                        </Button>
                      </Link>
                    </div>
                  )}

                  {/* Quick Links */}
                  <div className="mt-4 space-y-2">
                    {company?.websiteUrl && (
                      <a 
                        href={company.websiteUrl} 
                        target="_blank" 
                        rel="noopener" 
                        className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>Official Website</span>
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    <Link 
                      href="/compare" 
                      className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Compare with Others</span>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Broker Portal: active promotional offers (claimed brands only) */}
      {claimed && claimed.offers.length > 0 && (
        <OffersRail slug={normalisedSlug} offers={claimed.offers} />
      )}

      {/* Horizontal Banners */}
      <div className="bg-secondary/20 py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AdSlot placementKey="horizontal-1" fluid />
            <AdSlot placementKey="horizontal-2" fluid />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* items-start: columns only grow to their own content height, not to
              the tallest sibling. Without this the grid row stretches to the
              sidebar height, leaving a large void below the shorter column
              before the alternatives section. */}
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Pros & Cons — prefer section data, fall back to company editorial data */}
              {(prosConsSection?.pros || company?.pros) && (prosConsSection?.cons || company?.cons) && (
                <BrokerProsCons
                  pros={prosConsSection?.pros ?? company!.pros!}
                  cons={prosConsSection?.cons ?? company!.cons!}
                />
              )}

              {/* About — bulk-imported long description. Section data always takes priority. */}
              {aboutSection?.body && (
                <Card>
                  <CardHeader>
                    <CardTitle>About {company?.name ?? normalisedSlug}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm prose-gray dark:prose-invert max-w-none text-muted-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: aboutSection.body }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Key Facts Grid — bulk-imported. Section data always takes priority. */}
              {keyFactsSection && (
                <Card>
                  <CardHeader>
                    <CardTitle>Key Facts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {keyFactsSection.min_deposit_amount != null && (
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Min. Deposit</p>
                          <p className="font-semibold text-sm mt-0.5">
                            {keyFactsSection.min_deposit_currency ?? ''}&nbsp;{keyFactsSection.min_deposit_amount}
                          </p>
                        </div>
                      )}
                      {keyFactsSection.max_leverage && (
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Max Leverage</p>
                          <p className="font-semibold text-sm mt-0.5">{keyFactsSection.max_leverage}</p>
                        </div>
                      )}
                      {keyFactsSection.spreads_from && (
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Spreads From</p>
                          <p className="font-semibold text-sm mt-0.5">{keyFactsSection.spreads_from}</p>
                        </div>
                      )}
                    </div>
                    {keyFactsSection.platforms && keyFactsSection.platforms.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-2">Platforms</p>
                        <div className="flex flex-wrap gap-2">
                          {keyFactsSection.platforms.map((p) => (
                            <Badge key={p} variant="secondary">{p}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {keyFactsSection.instruments && keyFactsSection.instruments.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-2">Instruments</p>
                        <div className="flex flex-wrap gap-2">
                          {keyFactsSection.instruments.map((i) => (
                            <Badge key={i} variant="outline">{i}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Account Types — bulk-imported trading conditions */}
              {tradingConditionsSection?.account_types && tradingConditionsSection.account_types.length > 0 && !company?.accountTypes?.length && (
                <Card>
                  <CardHeader>
                    <CardTitle>Account Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {tradingConditionsSection.account_types.map((acct, idx) => (
                        <div key={idx} className="border rounded-lg p-4 flex flex-col gap-2">
                          <p className="font-semibold text-sm">{acct.name}</p>
                          {acct.min_deposit && (
                            <p className="text-xs text-muted-foreground">Min deposit: {acct.min_deposit}</p>
                          )}
                          {acct.spreads_from && (
                            <p className="text-xs text-muted-foreground">Spreads from: {acct.spreads_from}</p>
                          )}
                          {acct.commission && (
                            <p className="text-xs text-muted-foreground">Commission: {acct.commission}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Regulation — bulk-imported. Section data always takes priority. */}
              {regulationSection && (regulationSection.regulators?.length || regulationSection.body || regulationSection.client_money || regulationSection.compensation_scheme || regulationSection.admin_summary) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Regulation &amp; Safety
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {regulationSection.regulators && regulationSection.regulators.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {regulationSection.regulators.map((r) => (
                          <Badge key={r} variant="secondary" className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />{r}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {regulationSection.admin_summary && (
                      <p className="text-sm text-muted-foreground">{regulationSection.admin_summary}</p>
                    )}
                    {regulationSection.client_money && (
                      <p className="text-sm text-muted-foreground">{regulationSection.client_money}</p>
                    )}
                    {regulationSection.compensation_scheme && (
                      <p className="text-sm text-muted-foreground">{regulationSection.compensation_scheme}</p>
                    )}
                    {regulationSection.body && (
                      <div
                        className="prose prose-sm prose-gray dark:prose-invert max-w-none text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: regulationSection.body }}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* FAQ — bulk-imported. Section data always takes priority. */}
              {faqSection?.items && faqSection.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {faqSection.items.map((item, idx) => (
                        <AccordionItem key={idx} value={`faq-${idx}`}>
                          <AccordionTrigger className="text-sm font-medium text-left">
                            {item.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                            {item.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}

              {/* Prop Firm Challenge Details */}
              {isPropFirm && company?.propFirmDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle>Challenge & Funding Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Challenge Types */}
                    {company.propFirmDetails.challengeTypes && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Challenge Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {company.propFirmDetails.challengeTypes.map((type) => (
                            <Badge key={type} variant="secondary">{type}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Account Sizes */}
                    {company.propFirmDetails.accountSizes && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Account Sizes</h4>
                        <div className="flex flex-wrap gap-2">
                          {company.propFirmDetails.accountSizes.map((size) => (
                            <Badge key={size} variant="outline">{size}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Terms Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {company.propFirmDetails.evaluationFee && (
                        <div className="p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Evaluation Fee</p>
                          <p className="font-semibold text-foreground">{company.propFirmDetails.evaluationFee}</p>
                        </div>
                      )}
                      {company.propFirmDetails.profitSplit && (
                        <div className="p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Profit Split</p>
                          <p className="font-semibold text-foreground">{company.propFirmDetails.profitSplit}</p>
                        </div>
                      )}
                      {company.propFirmDetails.dailyDrawdown && (
                        <div className="p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Daily Drawdown</p>
                          <p className="font-semibold text-foreground">{company.propFirmDetails.dailyDrawdown}</p>
                        </div>
                      )}
                      {company.propFirmDetails.maximumDrawdown && (
                        <div className="p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Max Drawdown</p>
                          <p className="font-semibold text-foreground">{company.propFirmDetails.maximumDrawdown}</p>
                        </div>
                      )}
                      {company.propFirmDetails.payoutFrequency && (
                        <div className="p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Payout Frequency</p>
                          <p className="font-semibold text-foreground">{company.propFirmDetails.payoutFrequency}</p>
                        </div>
                      )}
                      {company.propFirmDetails.scalingPlan && (
                        <div className="p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Scaling Plan</p>
                          <p className="font-semibold text-foreground">{company.propFirmDetails.scalingPlan}</p>
                        </div>
                      )}
                    </div>

                    {/* Trading Rules */}
                    {company.propFirmDetails.tradingRules && company.propFirmDetails.tradingRules.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Trading Rules</h4>
                        <ul className="space-y-1">
                          {company.propFirmDetails.tradingRules.map((rule, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Check className="w-4 h-4 text-success flex-shrink-0" />
                              {rule}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Detailed Review */}
              {company?.longDescription && (
                <Card>
                  <CardHeader>
                    <CardTitle>Full {company.name} Review</CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-gray max-w-none">
                    {company.longDescription.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="text-muted-foreground leading-relaxed mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Account Types (for brokers) */}
              {!isPropFirm && company?.accountTypes && company.accountTypes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Account Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Fable5: items-stretch + h-full flex column so every card
                        shares the same height; an invisible badge placeholder on
                        non-first cards keeps all account names on one baseline. */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                      {company.accountTypes.map((account, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-xl border h-full flex flex-col ${idx === 0 ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
                        >
                          <Badge
                            className={`mb-2 border-0 text-xs self-start ${
                              idx === 0 ? 'bg-primary/10 text-primary' : 'invisible'
                            }`}
                            aria-hidden={idx !== 0}
                          >
                            Most Popular
                          </Badge>
                          <h4 className="font-semibold text-foreground">{account.name}</h4>
                          <div className="mt-3 space-y-2 text-sm">
                            {account.minDeposit && (
                              <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">Min Deposit</span>
                                <span className="font-medium tabular-nums text-right">{account.minDeposit}</span>
                              </div>
                            )}
                            {account.spreadsFrom && (
                              <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">Spreads</span>
                                <span className="font-medium tabular-nums text-right">{account.spreadsFrom}</span>
                              </div>
                            )}
                            {account.commission && (
                              <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">Commission</span>
                                <span className="font-medium tabular-nums text-right">{account.commission}</span>
                              </div>
                            )}
                          </div>
                          {account.features && (
                            <ul className="mt-3 space-y-1">
                              {account.features.map((feature, fidx) => (
                                <li key={fidx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* T52: Fees Table — renders only when feesTable is populated */}
              {company?.feesTable && company.feesTable.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Fees &amp; Spreads</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-secondary/30">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Instrument</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Spread</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Commission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {company.feesTable.map((row, idx) => (
                            <tr key={idx} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{row.instrument}</td>
                              <td className="px-4 py-3 text-muted-foreground">{row.spread}</td>
                              <td className="px-4 py-3 text-muted-foreground">{row.commission ?? 'None'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* T52: Tested Spreads — editorial live-tested data */}
              {company?.testedSpreads && company.testedSpreads.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>BestForex.io Tested Spreads</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-secondary/30">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Instrument</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Spread (tested)</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tested</th>
                          </tr>
                        </thead>
                        <tbody>
                          {company.testedSpreads.map((row, idx) => (
                            <tr key={idx} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{row.instrument}</td>
                              <td className="px-4 py-3 text-muted-foreground">{row.spread}</td>
                              <td className="px-4 py-3 text-muted-foreground">{row.tested ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Instruments & Payment Methods */}
              {(company?.instruments?.length || company?.depositMethods?.length) && (
                <Tabs defaultValue="instruments">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="instruments">Instruments</TabsTrigger>
                    {company?.depositMethods && <TabsTrigger value="deposits">Deposit Methods</TabsTrigger>}
                    {company?.withdrawalMethods && <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>}
                  </TabsList>
                  
                  <TabsContent value="instruments" className="mt-4">
                    <Card>
                      <CardContent className="p-6">
                        {company?.instruments && (
                          <div className="flex flex-wrap gap-2">
                            {company.instruments.map((instrument) => (
                              <Badge key={instrument} variant="secondary" className="text-sm">
                                {instrument}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {company?.currencyPairs && (
                          <p className="mt-4 text-sm text-muted-foreground">
                            <strong>{company.currencyPairs}</strong> currency pairs available for trading
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {company?.depositMethods && (
                    <TabsContent value="deposits" className="mt-4">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex flex-wrap gap-2">
                            {company.depositMethods.map((method) => (
                              <Badge key={method} variant="outline" className="text-sm">
                                {method}
                              </Badge>
                            ))}
                          </div>
                          {company.minDeposit && (
                            <p className="mt-4 text-sm text-muted-foreground">
                              Minimum deposit: <strong>{company.minDeposit}</strong>
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {company?.withdrawalMethods && (
                    <TabsContent value="withdrawals" className="mt-4">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex flex-wrap gap-2">
                            {company.withdrawalMethods.map((method) => (
                              <Badge key={method} variant="outline" className="text-sm">
                                {method}
                              </Badge>
                            ))}
                          </div>
                          {company.withdrawalTime && (
                            <p className="mt-4 text-sm text-muted-foreground">
                              Processing time: <strong>{company.withdrawalTime}</strong>
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </Tabs>
              )}

              {/* Bonuses */}
              {brokerOffers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{company?.name} Bonuses & Offers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {brokerOffers.map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between gap-4 p-4 bg-secondary/50 rounded-xl">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-foreground">{offer.title}</h4>
                          <p className="text-sm text-muted-foreground">{offer.description}</p>
                          {offer.terms && (
                            <p className="text-xs text-muted-foreground mt-1">{offer.terms}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-success">{offer.value}</p>
                          <OutLink href={offer.affiliateUrl} sponsored>
                            <Button size="sm" className="mt-2 bg-primary hover:bg-primary/90">
                              Claim
                            </Button>
                          </OutLink>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* T50: Related Coverage — news articles mentioning this broker */}
              {relatedPosts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Related Coverage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {relatedPosts.map(post => (
                      <Link
                        key={post.slug}
                        href={`/news/${post.slug}`}
                        className="group flex gap-4 items-start hover:bg-secondary/40 rounded-lg p-2 -mx-2 transition-colors"
                      >
                        {post.featuredImage && (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                            <Image
                              src={post.featuredImage}
                              alt={post.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {post.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(new Date(post.publishedAt))}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* T51: Full Review — only renders when reviewBody is populated.
                  Content is supplied by Kerem; no placeholder copy is shown. */}
              {company?.reviewBody && (
                <Card>
                  <CardHeader>
                    <CardTitle>{company.name} — Full Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_p]:leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: company.reviewBody }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* FAQ — T44 forceMount, T51 unified source */}
              {unifiedFaqs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* T44: forceMount keeps answer text in the server HTML so
                        Google can parse FAQPage rich results even when collapsed.
                        The AccordionContent uses data-[state=closed]:hidden via
                        its own className to hide visually. */}
                    <Accordion type="single" collapsible className="w-full">
                      {unifiedFaqs.map((faq, idx) => (
                        <AccordionItem key={idx} value={`faq-${idx}`}>
                          <AccordionTrigger className="text-left">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent forceMount className="text-muted-foreground data-[state=closed]:hidden">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Score Breakdown */}
              {company?.scores && <BrokerScoreBreakdown scores={company.scores} />}
              
              {/* Quick Facts */}
              {company && <BrokerQuickFacts broker={company} />}

              {/* Best Brokers Top 10 */}
              <Card className="gap-3">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    Best Brokers
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {top10Brokers.map((b, idx) => (
                      <li key={b.id}>
                        <Link
                          href={`/brokers/${b.slug}`}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors',
                            b.slug === company?.slug && 'bg-primary/5'
                          )}
                        >
                          <span className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                            idx === 0 ? 'bg-primary text-primary-foreground' :
                            idx === 1 ? 'bg-secondary text-secondary-foreground' :
                            idx === 2 ? 'bg-amber-100 text-amber-700' :
                            'bg-muted text-muted-foreground'
                          )}>
                            {idx + 1}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={cn(
                              'text-xs font-medium truncate block',
                              b.slug === company?.slug ? 'text-primary' : 'text-foreground'
                            )}>
                              {b.name}
                            </span>
                          </span>
                          <span className="text-xs font-semibold text-primary flex-shrink-0">
                            {b.rating}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="px-4 py-3 border-t border-border">
                    <Link href="/brokers" className="text-xs text-primary hover:underline font-medium">
                      View all rankings
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Platforms */}
              {company?.platforms && company.platforms.length > 0 && (
                <Card className="gap-3">
                  {/* Fable5: Card uses an internal flex gap-6 — gap-3 tightens the
                      title-to-content distance on compact sidebar cards. */}
                  <CardHeader>
                    <CardTitle className="text-sm">Trading Platforms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {company.platforms.map((platform) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Regulators */}
              {company?.regulators && company.regulators.length > 0 && (
                <Card className="gap-3">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 text-success" />
                      Regulation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {company.regulators.map((regulator) => (
                        <li key={regulator} className="text-sm text-muted-foreground flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-success" />
                          {regulator}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Restricted Countries */}
              {company?.restrictedCountries && company.restrictedCountries.length > 0 && (
                <Card className="gap-3">
                  <CardHeader>
                    <CardTitle className="text-sm">Not Available In</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {company.restrictedCountries.map((country) => (
                        <Badge key={country} variant="destructive" className="text-xs">
                          {country}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Verification Info */}
              {company && (
                <Card>
                  <CardContent className="p-4">
                    {/* Fable5: pills on their own wrapping row, date on a separate
                        line below — prevents the cramped single-line collision
                        between badges and the "Last verified" text. */}
                    <div className="flex flex-wrap items-center gap-2">
                      <VerificationBadge
                        verificationStatus={company.verificationStatus ?? 'unverified'}
                        isSponsored={company.isSponsored}
                        display="pill"
                      />
                    </div>
                    {/* T42: show date ONLY in verified/claimed/sponsored states —
                        an unverified badge alongside a "last verified" date is
                        contradictory and misleading. */}
                    {/* Row 44: only show date when status is genuinely verified/claimed/sponsored.
                        The ?? 'verified' fallback is removed here — if status is absent the
                        field stays hidden rather than inventing a verification claim. */}
                    {company.lastVerifiedAt &&
                      company.verificationStatus &&
                      ['verified', 'claimed', 'sponsored'].includes(company.verificationStatus) && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Last verified: {new Date(company.lastVerifiedAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                  </CardContent>
                </Card>
              )}

              {/* Sidebar Ad */}
              <AdSlot placementKey="square-1" />
            </div>
          </div>
        </div>
      </section>

      {/* Alternative Companies */}
      {alternatives.length > 0 && (
        <section className="py-12 bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Compare Alternatives to {company?.name}
            </h2>
            <div className="grid md:grid-cols-3 gap-6 items-stretch">
              {alternatives.map((altCompany, idx) => {
                const brokerFormat =
                  brokers.find((broker) => broker.id === altCompany.id) ??
                  directoryCompanyToBroker(altCompany)
                return (
                  <BrokerCard key={altCompany.id} broker={brokerFormat} variant="compact" rank={idx + 1} />
                )
              })}
            </div>
            <div className="mt-8 text-center">
              <Link href="/brokers">
                <Button variant="outline" size="lg">
                  Browse Full Directory
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
