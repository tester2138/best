// ============================================================
// GLOBAL FOREX BROKER DIRECTORY TYPES
// ============================================================

/**
 * Company category - distinguishes between forex brokers and prop firms
 * @deprecated Use EntityType instead. CompanyCategory kept for back-compat.
 */
export type CompanyCategory = 'forex-broker' | 'cfd-broker' | 'prop-firm' | 'crypto-exchange' | 'multi-asset'

/**
 * T41: Full entity taxonomy.
 *
 * Retail entity types (shown in rankings, /brokers pagination, A-Z):
 *   forex_broker | cfd_broker | prop_firm
 *
 * Non-retail entity types (noindex, excluded from rankings):
 *   exchange | hedge_fund | bank_desk | clearing | investment_bank |
 *   prediction_market | other
 *
 * Seeding rules (mechanical, do not guess beyond these):
 *  - exchange:          name contains Exchange / Boerse / Borsa / Bourse /
 *                       Nasdaq / HKEX / Eurex / Xetra
 *  - hedge_fund:        AQR, Winton, Graham Capital, CFM, Systematica,
 *                       Voloridge, Verition
 *  - bank_desk:         SEB, Nordea, Danske, Handelsbanken, Swedbank,
 *                       Bankinter, CaixaBank
 *  - clearing:          LCH, Pershing, Apex Clearing
 *  - investment_bank:   Jefferies, Stifel, Raymond James, Merrill
 *  - prediction_market: Polymarket, Kalshi
 *  - prop_firm:         firms whose name/description contains
 *                       "challenge" or "funded"
 *  - everything else:   forex_broker
 */
export type EntityType =
  | 'forex_broker'
  | 'cfd_broker'
  | 'prop_firm'
  | 'exchange'
  | 'hedge_fund'
  | 'bank_desk'
  | 'clearing'
  | 'investment_bank'
  | 'prediction_market'
  | 'other'

/** Entity types displayed in /brokers rankings, pagination, and A-Z. */
export const RETAIL_ENTITY_TYPES: EntityType[] = ['forex_broker', 'cfd_broker', 'prop_firm']

/** Returns true if the entity type is retail-facing and should appear in rankings. */
export function isRetailEntityType(type: EntityType | undefined): boolean {
  if (!type) return true // legacy records without entityType default to retail
  return RETAIL_ENTITY_TYPES.includes(type)
}

/**
 * Verification status for directory listings
 * - verified: Fully reviewed and verified by BestForex.io editorial team
 * - partially-verified: Some information verified, others pending
 * - under-review: Data imported but not yet reviewed
 * - unverified: Listed in directory but not yet verified. Brand must contact us to be verified.
 * - claimed: Broker representative has claimed and manages the profile
 * - sponsored: Broker has active paid placement
 */
export type VerificationStatus = 
  | 'verified' 
  | 'partially-verified' 
  | 'under-review'
  | 'unverified'
  | 'claimed' 
  | 'sponsored'

/**
 * Data quality stage for progressive profile enrichment
 */
export type DataQualityStage = 
  | 'basic'      // Brand name, website, category, logo
  | 'enriched'   // + description, country, platforms, basic trading info
  | 'reviewed'   // + editorial review, verification, structured details
  | 'claimed'    // + broker-managed information
  | 'featured'   // + active paid visibility

/**
 * Prop trading firm specific details
 */
export type PropFirmDetails = {
  challengeTypes: string[]
  accountSizes: string[]
  evaluationFee?: string
  profitSplit?: string
  payoutFrequency?: string
  dailyDrawdown?: string
  maximumDrawdown?: string
  tradingRules?: string[]
  allowedInstruments?: string[]
  scalingPlan?: string
  restrictedCountries?: string[]
  kycRequired?: boolean
  refundPolicy?: string
}

/**
 * Extended company profile for the global directory
 * Supports both forex brokers and prop trading firms
 */
export type DirectoryCompany = {
  // Core identification
  id: string
  slug: string
  name: string
  legalName?: string
  logoUrl?: string
  websiteUrl: string
  affiliateUrl?: string
  
  // Classification
  category: CompanyCategory
  /** T41: granular entity taxonomy. Defaults to forex_broker when absent. */
  entityType?: EntityType

  // T51: Long-form review content. Sections render only when populated —
  // no placeholder lorem. Prop firms use these in addition to brokers.
  /** HTML-safe review prose for the "Full Review" section. Supplied by Kerem. */
  reviewBody?: string
  /** Structured FAQ items — rendered in the profile FAQ accordion and FAQPage JSON-LD. */
  faqItems?: { question: string; answer: string }[]

  // T52: Deep review structured blocks. All optional; profile renders
  // each block only when the field is present.
  /** Reviewer display name (editorial byline). */
  reviewerName?: string
  /** ISO 8601 date the review was first published. */
  reviewDate?: string
  /** ISO 8601 date the review was last updated. */
  updateDate?: string
  /** Tested spreads list per instrument (shown in Fees section). */
  testedSpreads?: { instrument: string; spread: string; tested?: string }[]
  /** Fees table rows. */
  feesTable?: { instrument: string; spread: string; commission?: string }[]
  /** Platform breakdown items for the Platforms section. */
  platformBreakdown?: { name: string; description: string }[]
  /** Expanded pros list (overrides/supplements the base pros field). */
  expandedPros?: string[]
  /** Expanded cons list (overrides/supplements the base cons field). */
  expandedCons?: string[]

  verificationStatus: VerificationStatus
  dataQualityStage: DataQualityStage
  
  // Basic information
  shortDescription?: string
  longDescription?: string
  foundedYear?: number
  headquarters?: string
  country?: string
  
  // Rating (optional - only for reviewed companies)
  rating?: number
  ratingLabel?: string
  rank?: number
  
  // Regulation (forex brokers)
  regulators?: string[]
  regulationSummary?: string
  
  // Trading conditions
  platforms?: string[]
  instruments?: string[]
  currencyPairs?: string
  minDeposit?: string
  spreadsFrom?: string
  commissions?: string
  maxLeverageRetail?: string
  maxLeverageProfessional?: string
  
  // Payment methods
  depositMethods?: string[]
  withdrawalMethods?: string[]
  withdrawalTime?: string
  
  // Account information
  accountTypes?: {
    name: string
    minDeposit?: string
    spreadsFrom?: string
    commission?: string
    features?: string[]
  }[]
  
  // Bonuses and offers
  hasBonus?: boolean
  bonusSummary?: string
  
  // Prop firm specific (only for prop-firm category)
  propFirmDetails?: PropFirmDetails
  
  // Editorial content (for reviewed profiles)
  pros?: string[]
  cons?: string[]
  scores?: {
    overall: number
    trustSafety?: number
    tradingConditions?: number
    platforms?: number
    researchEducation?: number
    customerService?: number
    mobileTrading?: number
  }
  
  // SEO
  seo?: {
    metaTitle?: string
    metaDescription?: string
    h1?: string
    faqSchema?: { question: string; answer: string }[]
  }
  
  // Visibility and monetization
  isFeatured: boolean
  isSponsored: boolean
  /** CSV master-ranking display rank — lower number = higher prominence.
   *  Injected by the public-brokers overlay; undefined until seeded. */
  displayRank?: number
  /** TRUE for the second+ occurrence of the same slug in the CSV. Hidden from
   *  all listing pages; profile page gets noindex robots meta. */
  isDuplicate?: boolean
  
  // Metadata
  sourceUrls?: string[]
  lastVerifiedAt?: string
  lastUpdatedAt?: string
  createdAt?: string
  
  // For compatibility with existing Broker type
  bestFor?: string[]
  badges?: string[]
  mobileApps?: string[]
  countriesServed?: string[]
  restrictedCountries?: string[]
  inactivityFee?: string
  bonuses?: {
    title: string
    description: string
    type: string
    value?: string
    terms?: string
  }[]
}

/**
 * Directory filter options
 */
export type DirectoryFilters = {
  search?: string
  category?: CompanyCategory | 'all'
  country?: string
  regulator?: string
  platform?: string
  minDeposit?: string
  hasBonus?: boolean
  verificationStatus?: VerificationStatus | 'all'
  sortBy?: 'rating' | 'featured' | 'name' | 'newest' | 'min-deposit' | 'spreads'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Directory statistics for display
 */
export type DirectoryStats = {
  totalBrokers: number
  totalPropFirms: number
  countriesCovered: number
  regulatorsCovered: number
  dataPoints: number
  lastUpdated: string
}

/**
 * Claim profile form data
 */
export type ClaimProfileFormData = {
  name: string
  company: string
  role: string
  businessEmail: string
  officialWebsite: string
  profileUrl: string
  updateRequest: string
  interestedInAdvertising: boolean
  message?: string
}

/**
 * Add broker form data
 */
export type AddBrokerFormData = {
  companyName: string
  officialWebsite: string
  companyType: CompanyCategory
  country: string
  businessEmail: string
  shortDescription?: string
  regulationStatus?: string
  listingType: 'free' | 'featured'
  message?: string
}
