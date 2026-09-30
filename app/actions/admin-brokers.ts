'use server'

import { z } from 'zod'
import { queryOne, withTransaction } from '@/lib/portal/db'
import { audit } from '@/lib/audit'
import { hasGlobalStaffScope, requireStaff, requireStaffBrand } from '@/lib/guards'
import { Err, run } from '@/lib/portal/result'
import { roleHasPermission } from '@/lib/staff-permissions'
import { revalidateBrand } from '@/lib/portal/revalidate'
import { directoryCompanies } from '@/data/directory'

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional()
const stringList = z.array(z.string().trim().max(500)).max(100).nullable().optional()
const scoreValue = z.number().min(0).max(5)

const FaqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(4000),
})

const ProfileSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  legalName: nullableText(200),
  logoUrl: z.string().trim().max(2048).nullable().optional(),
  websiteUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(),
  affiliateUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(),
  category: z.enum(['forex-broker', 'cfd-broker', 'prop-firm', 'crypto-exchange', 'multi-asset']).optional(),
  entityType: z.enum(['forex_broker', 'cfd_broker', 'prop_firm', 'exchange', 'hedge_fund', 'bank_desk', 'clearing', 'investment_bank', 'prediction_market', 'other']).nullable().optional(),
  dataQualityStage: z.enum(['basic', 'enriched', 'reviewed', 'claimed', 'featured']).optional(),
  shortDescription: nullableText(2000),
  longDescription: nullableText(16000),
  foundedYear: z.number().int().min(1800).max(2200).nullable().optional(),
  headquarters: nullableText(240),
  country: nullableText(120),
  rating: scoreValue.nullable().optional(),
  ratingLabel: nullableText(80),
  rank: z.number().int().min(0).max(1000000).nullable().optional(),
  regulators: z.array(z.union([
    z.string().trim().max(180),
    z.object({
      authority: z.string().trim().min(1).max(180),
      country: z.string().trim().max(120),
      licenseNumber: z.string().trim().max(120),
    }),
  ])).max(60).nullable().optional(),
  regulationSummary: nullableText(4000),
  platforms: stringList,
  instruments: stringList,
  currencyPairs: nullableText(200),
  minDeposit: nullableText(120),
  spreadsFrom: nullableText(120),
  commissions: nullableText(240),
  maxLeverageRetail: nullableText(120),
  maxLeverageProfessional: nullableText(120),
  depositMethods: stringList,
  withdrawalMethods: stringList,
  withdrawalTime: nullableText(240),
  accountTypes: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    minDeposit: z.string().max(120).optional(),
    spreadsFrom: z.string().max(120).optional(),
    commission: z.string().max(240).optional(),
    leverage: z.string().max(120).optional(),
    features: z.array(z.string().max(500)).max(40).optional(),
  })).max(40).nullable().optional(),
  hasBonus: z.boolean().nullable().optional(),
  bonusSummary: nullableText(1000),
  propFirmDetails: z.object({
    challengeTypes: z.array(z.string().max(300)).max(40).optional(),
    accountSizes: z.array(z.string().max(120)).max(40).optional(),
    evaluationFee: z.string().max(240).optional(),
    profitSplit: z.string().max(160).optional(),
    payoutFrequency: z.string().max(160).optional(),
    dailyDrawdown: z.string().max(160).optional(),
    maximumDrawdown: z.string().max(160).optional(),
    tradingRules: z.array(z.string().max(600)).max(60).optional(),
    allowedInstruments: z.array(z.string().max(180)).max(40).optional(),
    scalingPlan: z.string().max(2000).optional(),
    restrictedCountries: z.array(z.string().max(120)).max(100).optional(),
    kycRequired: z.boolean().optional(),
    refundPolicy: z.string().max(2000).optional(),
  }).nullable().optional(),
  pros: stringList,
  cons: stringList,
  scores: z.object({
    overall: scoreValue,
    trustSafety: scoreValue.optional(),
    tradingConditions: scoreValue.optional(),
    platforms: scoreValue.optional(),
    researchEducation: scoreValue.optional(),
    customerService: scoreValue.optional(),
    mobileTrading: scoreValue.optional(),
  }).nullable().optional(),
  seo: z.object({
    metaTitle: z.string().max(200).optional(),
    metaDescription: z.string().max(400).optional(),
    h1: z.string().max(200).optional(),
    faqSchema: z.array(FaqSchema).max(40).optional(),
  }).nullable().optional(),
  trustpilot: z.object({
    score: z.number().min(0).max(5),
    totalReviews: z.number().int().min(0).max(100000000),
    oneStarPercentage: z.number().min(0).max(100).optional(),
  }).nullable().optional(),
  reviewBody: nullableText(30000),
  faqItems: z.array(FaqSchema).max(60).nullable().optional(),
  reviewerName: nullableText(160),
  reviewDate: nullableText(40),
  updateDate: nullableText(40),
  testedSpreads: z.array(z.object({
    instrument: z.string().trim().min(1).max(100),
    spread: z.string().trim().min(1).max(100),
    tested: z.string().max(80).optional(),
  })).max(100).nullable().optional(),
  feesTable: z.array(z.object({
    instrument: z.string().trim().min(1).max(100),
    spread: z.string().trim().max(100),
    commission: z.string().max(160).optional(),
  })).max(100).nullable().optional(),
  platformBreakdown: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2000),
  })).max(60).nullable().optional(),
  expandedPros: stringList,
  expandedCons: stringList,
  sourceUrls: z.array(z.union([z.string().url(), z.literal('')])).max(100).nullable().optional(),
  lastVerifiedAt: nullableText(80),
  lastUpdatedAt: nullableText(80),
  createdAt: nullableText(80),
  bestFor: stringList,
  badges: stringList,
  mobileApps: stringList,
  countriesServed: stringList,
  restrictedCountries: stringList,
  inactivityFee: nullableText(240),
  bonuses: z.array(z.object({
    title: z.string().trim().min(1).max(240),
    description: z.string().max(2000),
    type: z.string().max(80),
    value: z.string().max(120).optional(),
    terms: z.string().max(4000).optional(),
    code: z.string().max(120).optional(),
    expiresAt: z.string().max(80).optional(),
  })).max(60).nullable().optional(),
})

const CommercialSchema = z.object({
  verificationStatus: z.enum(['verified', 'unverified']),
  isSponsored: z.boolean(),
  isFeatured: z.boolean(),
  displayRank: z.number().int().min(0).max(1000000).nullable(),
  brandCategory: z.string().trim().max(120),
  brandStatus: z.string().trim().max(120),
  regulatorTier: z.string().trim().max(120),
  internalPriority: z.string().trim().max(120),
  internalNotes: z.string().max(5000),
  needsManualReview: z.boolean(),
  isDuplicate: z.boolean(),
})

const InputSchema = z.object({
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  profile: z.record(z.string(), z.unknown()).optional(),
  profileVersion: z.number().int().min(0).optional(),
  commercial: CommercialSchema.optional(),
})

type AdminBrandRecord = {
  id: string
  slug: string
  name: string
  website: string | null
  verification_status: 'verified' | 'unverified'
  is_sponsored: boolean
  is_featured: boolean
  display_rank: number | null
  brand_category: string | null
  brand_status: string | null
  regulator_tier: string | null
  internal_priority: string | null
  internal_notes: string | null
  needs_manual_review: boolean
  rating_score: number | string | null
  is_duplicate: boolean
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function shouldStoreOverride(value: unknown, sourceValue: unknown): boolean {
  if (value === undefined) return false
  if ((value === null || value === '') && sourceValue == null) return false
  if (Array.isArray(value) && value.length === 0 && sourceValue == null) return false
  return !sameJsonValue(value, sourceValue)
}

export async function updateAdminBrokerProfile(raw: unknown) {
  return run(async () => {
    const parsedInput = InputSchema.safeParse(raw)
    if (!parsedInput.success) {
      throw new Err('Check the profile fields and try again.', 'validation', {
        issues: parsedInput.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const input = parsedInput.data
    const actor = await requireStaff('brokers:read')
    const canEditProfile = roleHasPermission(actor.role, 'editorial:write')
    const canManageCommercial = roleHasPermission(actor.role, 'brokers:manage')
    if (input.profile && !canEditProfile) throw new Err('Editorial profile access is required.', 'forbidden')
    if (input.commercial && !canManageCommercial) throw new Err('Commercial placement access is required.', 'forbidden')
    if (!input.profile && !input.commercial) throw new Err('No broker changes were submitted.', 'validation')
    if (input.profile && input.profileVersion === undefined)
      throw new Err('Refresh the profile editor and try again.', 'version_conflict')

    const staticCompany = directoryCompanies.find((company) => company.slug === input.slug)
    const currentBrand = await queryOne<AdminBrandRecord>(
      `select id, slug, name, website, verification_status, is_sponsored, is_featured,
              display_rank, brand_category, brand_status, regulator_tier, internal_priority,
              internal_notes, needs_manual_review, rating_score, is_duplicate
         from public.brands where slug = $1 limit 1`,
      [input.slug],
    )

    if (currentBrand) {
      await requireStaffBrand(currentBrand.id, 'brokers:read')
    } else if (!(await hasGlobalStaffScope(actor))) {
      throw new Err('A global staff scope is required to create this directory record.', 'not_found')
    }
    if (!staticCompany && !currentBrand) throw new Err('Broker profile not found.', 'not_found')

    let profile: z.infer<typeof ProfileSchema> | undefined
    if (input.profile) {
      const profileResult = ProfileSchema.safeParse(input.profile)
      if (!profileResult.success) {
        throw new Err('One or more profile fields are invalid.', 'validation', {
          issues: profileResult.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        })
      }
      profile = profileResult.data
      if (!profile.name) throw new Err('Company name is required.', 'validation')
    }

    const newRecord = !currentBrand
    const defaultName = profile?.name ?? currentBrand?.name ?? staticCompany?.name ?? input.slug
    const defaultWebsite = profile?.websiteUrl ?? currentBrand?.website ?? staticCompany?.websiteUrl ?? null
    const sourceVerification = staticCompany?.verificationStatus === 'verified' ? 'verified' : 'unverified'
    const initialRating = profile && Object.prototype.hasOwnProperty.call(profile, 'rating')
      ? profile.rating
      : currentBrand?.rating_score != null
        ? Number(currentBrand.rating_score)
        : staticCompany?.rating ?? null

    const initialCommercial = input.commercial ?? {
      verificationStatus: currentBrand?.verification_status ?? sourceVerification,
      isSponsored: currentBrand?.is_sponsored ?? staticCompany?.isSponsored ?? false,
      isFeatured: currentBrand?.is_featured ?? staticCompany?.isFeatured ?? false,
      displayRank: currentBrand?.display_rank ?? staticCompany?.displayRank ?? null,
      brandCategory: currentBrand?.brand_category ?? staticCompany?.category ?? '',
      brandStatus: currentBrand?.brand_status ?? '',
      regulatorTier: currentBrand?.regulator_tier ?? '',
      internalPriority: currentBrand?.internal_priority ?? '',
      internalNotes: currentBrand?.internal_notes ?? '',
      needsManualReview: currentBrand?.needs_manual_review ?? false,
      isDuplicate: currentBrand?.is_duplicate ?? staticCompany?.isDuplicate ?? false,
    }

    const committed = await withTransaction(async (client) => {
      const brandResult = await client.query<{ id: string }>(
        `insert into public.brands (slug, name, website, verification_status, is_sponsored,
                                    is_featured, display_rank, brand_category, brand_status,
                                    regulator_tier, internal_priority, internal_notes,
                                    needs_manual_review, rating_score, is_duplicate)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         on conflict (slug) do update set updated_at = now()
         returning id`,
        [
          input.slug,
          defaultName,
          defaultWebsite || null,
          initialCommercial.verificationStatus,
          initialCommercial.isSponsored,
          initialCommercial.isFeatured,
          initialCommercial.displayRank,
          initialCommercial.brandCategory || staticCompany?.category || null,
          initialCommercial.brandStatus || null,
          initialCommercial.regulatorTier || null,
          initialCommercial.internalPriority || null,
          initialCommercial.internalNotes || null,
          initialCommercial.needsManualReview,
          initialRating,
          initialCommercial.isDuplicate,
        ],
      )
      const brandId = brandResult.rows[0]?.id
      if (!brandId) throw new Err('Could not create the broker record.')

      if (profile) {
        const profileFields = Object.keys(ProfileSchema.shape)
        const sectionResult = await client.query<{
          version: number
          published: Record<string, unknown> | null
        }>(
          `select version, published from public.broker_page_sections
            where brand_id = $1 and section_key = 'company' for update`,
          [brandId],
        )
        const existingSection = sectionResult.rows[0]
        if (existingSection && existingSection.version !== input.profileVersion)
          throw new Err('This profile changed elsewhere. Refresh before saving.', 'version_conflict', {
            serverVersion: existingSection.version,
          })
        if (!existingSection && input.profileVersion !== 0)
          throw new Err('This profile changed elsewhere. Refresh before saving.', 'version_conflict')

        const previousPublished = asRecord(existingSection?.published)
        const previousOverrides = asRecord(previousPublished.admin_profile_overrides)
        const source = staticCompany as unknown as Record<string, unknown> | undefined
        const overrides: Record<string, unknown> = Object.fromEntries(
          Object.entries(previousOverrides).filter(([key]) => !profileFields.includes(key)),
        )
        for (const [key, value] of Object.entries(profile)) {
          if (key === 'rating') {
            if (value === null && source?.rating != null) overrides.rating = null
            continue
          }
          if (shouldStoreOverride(value, source?.[key])) overrides[key] = value
        }

        const published = { ...previousPublished }
        if (Object.keys(overrides).length > 0) published.admin_profile_overrides = overrides
        else delete published.admin_profile_overrides
        const serialized = JSON.stringify(published)

        if (existingSection) {
          const changed = await client.query<{ version: number }>(
            `update public.broker_page_sections
                set published = $2::jsonb, version = version + 1,
                    updated_by = $3, published_at = now(), updated_at = now()
              where brand_id = $1 and section_key = 'company' and version = $4
              returning version`,
            [brandId, serialized, actor.id, input.profileVersion],
          )
          const nextVersion = changed.rows[0]?.version
          if (!nextVersion) throw new Err('This profile changed elsewhere. Refresh before saving.', 'version_conflict')
          await client.query(
            `insert into public.section_versions (brand_id, section_key, content, source, created_by)
             values ($1, 'company', $2::jsonb, 'admin_edit', $3)`,
            [brandId, serialized, actor.id],
          )
          await client.query(
            `update public.brands set name = $2, website = $3, rating_score = $4, updated_at = now()
              where id = $1`,
            [brandId, profile.name, profile.websiteUrl || null, profile.rating ?? null],
          )
          return { brandId, profileVersion: nextVersion }
        }

        const inserted = await client.query<{ version: number }>(
          `insert into public.broker_page_sections
             (brand_id, section_key, draft, published, status, version, updated_by, published_at)
           values ($1, 'company', $2::jsonb, $2::jsonb, 'synced', 1, $3, now())
           returning version`,
          [brandId, serialized, actor.id],
        )
        await client.query(
          `insert into public.section_versions (brand_id, section_key, content, source, created_by)
           values ($1, 'company', $2::jsonb, 'admin_edit', $3)`,
          [brandId, serialized, actor.id],
        )
        await client.query(
          `update public.brands set name = $2, website = $3, rating_score = $4, updated_at = now()
            where id = $1`,
          [brandId, profile.name, profile.websiteUrl || null, profile.rating ?? null],
        )
        return { brandId, profileVersion: inserted.rows[0]?.version ?? 1 }
      }

      if (input.commercial) {
        await client.query(
          `update public.brands
              set verification_status = $2, is_sponsored = $3, is_featured = $4,
                  display_rank = $5, brand_category = $6, brand_status = $7,
                  regulator_tier = $8, internal_priority = $9, internal_notes = $10,
                  needs_manual_review = $11, is_duplicate = $12, updated_at = now()
            where id = $1`,
          [
            brandId,
            input.commercial.verificationStatus,
            input.commercial.isSponsored,
            input.commercial.isFeatured,
            input.commercial.displayRank,
            input.commercial.brandCategory || null,
            input.commercial.brandStatus || null,
            input.commercial.regulatorTier || null,
            input.commercial.internalPriority || null,
            input.commercial.internalNotes || null,
            input.commercial.needsManualReview,
            input.commercial.isDuplicate,
          ],
        )
      }
      return { brandId, profileVersion: input.profileVersion ?? 0 }
    })

    const changedFields = [
      ...(profile ? Object.keys(profile) : []),
      ...(input.commercial ? Object.keys(input.commercial) : []),
    ]
    await audit(actor, committed.brandId, 'broker.admin_profile.update', input.slug, {
      changedFields,
      createdRecord: newRecord,
    })
    revalidateBrand(input.slug)
    return committed
  })
}

export const adminBrokerProfileSchema = ProfileSchema
export type AdminBrokerProfile = z.infer<typeof ProfileSchema>
export type AdminBrokerCommercial = z.infer<typeof CommercialSchema>
