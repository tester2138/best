import type { VerificationStatus } from '@/lib/directory-types'

// ============================================================
// BROKER TYPES
// ============================================================

export type AccountType = {
  name: string
  minDeposit: string
  spreadsFrom: string
  commission?: string
  leverage?: string
  features?: string[]
}

export type BrokerBonus = {
  title: string
  description: string
  code?: string
  expiresAt?: string
  terms?: string
  value?: string
  type: 'deposit' | 'no-deposit' | 'cashback' | 'rebate' | 'referral' | 'other'
}

export type BrokerScores = {
  overall: number
  trustSafety?: number
  tradingConditions?: number
  platforms?: number
  researchEducation?: number
  customerService?: number
  mobileTrading?: number
}

export type BrokerSEO = {
  metaTitle: string
  metaDescription: string
  h1: string
  faqSchema?: FAQItem[]
}

export type FAQItem = {
  question: string
  answer: string
}

export type Broker = {
  id: string
  slug: string
  name: string
  legalName?: string
  logoUrl: string
  websiteUrl: string
  affiliateUrl: string
  rank?: number
  rating: number
  ratingLabel?: string
  shortDescription: string
  longDescription: string
  foundedYear?: number
  headquarters?: string
  bestFor: string[]
  badges: string[]
  // brokers.ts data may have string[] or {authority,country,licenseNumber}[]
  // (e.g. go-markets, infinox). The convert function in directory.ts normalises
  // both to string[] before exposing them to consumers. The raw Broker type must
  // accept both so the static data file typechecks cleanly.
  regulators: (string | { authority: string; country: string; licenseNumber: string })[]
  countriesServed?: string[]
  restrictedCountries: string[]
  platforms: string[]
  mobileApps: string[]
  accountTypes: AccountType[]
  instruments: string[]
  currencyPairs?: string
  minDeposit: string
  spreadsFrom: string
  commissions?: string
  maxLeverageRetail: string
  maxLeverageProfessional?: string
  depositMethods: string[]
  withdrawalMethods: string[]
  withdrawalTime?: string
  inactivityFee?: string
  bonuses: BrokerBonus[]
  pros: string[]
  cons: string[]
  scores: BrokerScores
  seo: BrokerSEO
  trustpilot?: {
    score: number
    totalReviews: number
    oneStarPercentage?: number
  }
  sourceUrls?: string[]
  lastVerifiedAt: string
  isFeatured: boolean
  isSponsored: boolean
  verificationStatus?: VerificationStatus
}

// ============================================================
// AD PLACEMENT TYPES
// ============================================================

// Only 2 banner sizes supported: 468x60 (horizontal) and 300x250 (square)
export type AdSize = '468x60' | '300x250'

// Only 4 banners: horizontal-1, horizontal-2, square-1, square-2
export type AdPlacementKey = 
  | 'horizontal-1'
  | 'horizontal-2'
  | 'square-1'
  | 'square-2'

export type AdPlacement = {
  id: string
  placementKey: AdPlacementKey
  brandName: string
  imageUrl: string
  destinationUrl: string
  altText: string
  /** T27: empty string for house banners, 'Sponsored' for paid placements. */
  label: string
  desktopSize: AdSize
  mobileSize?: AdSize
  priority: number
  active: boolean
  startsAt?: string
  endsAt?: string
}

// ============================================================
// CONTENT TYPES
// ============================================================

export type PostCategory = 'news' | 'analysis' | 'education' | 'guide' | 'review' | 'opinion'

// Editorial classification, distinct from topical `category`. Required for
// Google News: opinion/analysis columns must NOT be submitted as hard news.
export type EditorialType = 'News' | 'Analysis' | 'Opinion'

export type Author = {
  name: string
  slug: string
  avatar?: string
  bio?: string
  role?: string
  /** T58: Topic expertise array used in schema.org Person knowsAbout. */
  beat?: string[]
  /** T58: Social / professional profile URLs for schema.org Person sameAs. */
  sameAs?: string[]
}

export type Post = {
  id: string
  slug: string
  title: string
  excerpt: string
  content?: string
  category: PostCategory
  // Editorial classification for labelling/badges and Google News compliance.
  // When omitted, derived from category (see getEditorialType in data/posts.ts).
  editorialType?: EditorialType
  author: Author
  publishedAt: string
  updatedAt?: string
  featuredImage?: string
  /** SEO-optimised title. Falls back to title when absent. */
  metaTitle?: string
  /** SEO-optimised meta description. Falls back to excerpt when absent. */
  metaDescription?: string
  /** Alt text for the featured image. Falls back to title when absent. */
  imageAltText?: string
  /** Word count, used for computed read time. */
  wordCount?: number
  /** Primary source name for attribution display. */
  sourceName?: string
  /** Primary source URL when a single primary citation is supplied. */
  sourceUrl?: string
  readingTime?: string
  tags?: string[]
  /** T50: Broker slugs this article covers — used by getPostsByBrokerSlug. */
  relatedBrokers?: string[]
  isFeatured: boolean
  /** T54: Primary sources linked at the foot of the article (label + URL).
   *  Rendered as a Sources list with rel=noopener. */
  linkedSources?: { label: string; url: string }[]
  /** Rows 163+164: Editorial note or correction displayed above the sources
   *  block. Rendered verbatim as a bordered callout. Plain text only. */
  editorNote?: string
}

// ============================================================
// OFFER TYPES
// ============================================================

export type Offer = {
  id: string
  brokerId: string
  brokerName: string
  brokerLogo: string
  title: string
  description: string
  value: string
  code?: string
  type: 'deposit' | 'no-deposit' | 'cashback' | 'rebate' | 'other'
  expiresAt?: string
  terms?: string
  affiliateUrl: string
  isFeatured: boolean
  isExclusive: boolean
}

// ============================================================
// NAVIGATION TYPES
// ============================================================

export type NavItem = {
  label: string
  href: string
  children?: NavItem[]
  isExternal?: boolean
  badge?: string
}

// ============================================================
// B2B / MEDIA KIT TYPES
// ============================================================

export type MediaPackage = {
  id: string
  name: string
  description: string
  price: string
  priceNote?: string
  features: string[]
  placements: string[]
  isPopular?: boolean
}

export type AudienceStat = {
  label: string
  value: string
  description?: string
}

// ============================================================
// COMPARISON TYPES
// ============================================================

export type ComparisonField = {
  key: keyof Broker | string
  label: string
  category: 'overview' | 'fees' | 'platforms' | 'regulation' | 'features'
  format?: 'text' | 'list' | 'rating' | 'boolean' | 'currency'
}
