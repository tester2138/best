'use client'

import Link from 'next/link'
import { Star, ExternalLink, Shield } from 'lucide-react'
import { BrokerLogo } from '@/components/brokers/broker-logo'
import { VerificationBadge } from '@/components/brands/verification-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { DirectoryCompany, VerificationStatus, EntityType } from '@/lib/directory-types'
import { OutLink } from '@/components/ui/out-link'
import { cn } from '@/lib/utils'

interface DirectoryListingCardProps {
  company: DirectoryCompany
  rank?: number
}

// P2-228: map entityType to a human-readable label so institutional entries
// (bank_desk, exchange, clearing, etc.) never show "Forex Broker".
const entityTypeLabels: Record<string, string> = {
  forex_broker: 'Forex Broker',
  cfd_broker: 'CFD Broker',
  prop_firm: 'Prop Firm',
  exchange: 'Exchange',
  hedge_fund: 'Hedge Fund',
  bank_desk: 'Bank / Dealer',
  clearing: 'Clearing House',
  investment_bank: 'Investment Bank',
  prediction_market: 'Prediction Market',
  other: 'Financial Firm',
}

const categoryFallbackLabels: Record<string, string> = {
  'forex-broker': 'Forex Broker',
  'cfd-broker': 'CFD Broker',
  'prop-firm': 'Prop Firm',
  'crypto-exchange': 'Crypto Exchange',
  'multi-asset': 'Multi-Asset',
}

export function DirectoryListingCard({ company, rank }: DirectoryListingCardProps) {
  // Prefer granular entityType label; fall back to category label for legacy entries
  const categoryLabel =
    (company.entityType && entityTypeLabels[company.entityType]) ||
    categoryFallbackLabels[company.category] ||
    company.category

  return (
    <Card className={cn(
      'overflow-hidden transition-all hover:shadow-md',
      company.isSponsored && 'border-primary/30 bg-primary/[0.02]',
      company.isFeatured && !company.isSponsored && 'border-success/30'
    )}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Logo and Basic Info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Rank (optional) */}
            {rank && (
              <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold text-muted-foreground flex-shrink-0">
                {rank}
              </div>
            )}

            {/* Logo — Logo.dev resolves the real brand logo from websiteUrl automatically */}
            <Link href={`/brokers/${company.slug}`} className="flex-shrink-0">
              <BrokerLogo
                name={company.name}
                slug={company.slug}
                logoUrl={company.logoUrl}
                websiteUrl={company.websiteUrl}
                size="md"
              />
            </Link>

            {/* Company Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link href={`/brokers/${company.slug}`} className="hover:underline">
                  <h3 className="font-semibold text-foreground truncate">{company.name}</h3>
                </Link>
                <VerificationBadge
                  verificationStatus={company.verificationStatus}
                  isSponsored={company.isSponsored}
                  display="icon"
                />
                {company.isFeatured && !company.isSponsored && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-success/10 text-success">
                    Featured
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {categoryLabel}
                </Badge>
                {company.country && (
                  <span className="text-xs text-muted-foreground">{company.country}</span>
                )}
              </div>

              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {company.shortDescription || 'Profile information is being reviewed.'}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-3 flex-shrink-0">
            {/* Rating — P2-228: only show numeric score for editorially reviewed profiles.
                Unreviewed stubs carry placeholder 1.0/1.1 scores that must not
                surface on directory cards. */}
            {company.rating && company.dataQualityStage === 'reviewed' ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'w-3.5 h-3.5',
                        star <= Math.round(company.rating!) ? 'fill-amber-400 text-amber-400' : 'text-muted'
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground">{company.rating.toFixed(1)}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Unrated</span>
            )}

            {/* Key Info Pills */}
            <div className="flex flex-wrap gap-1.5 justify-end">
              {company.minDeposit && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Min: {company.minDeposit}
                </span>
              )}
              {company.spreadsFrom && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {company.spreadsFrom}
                </span>
              )}
              {company.hasBonus && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success">
                  Bonus
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex sm:flex-col gap-2 flex-shrink-0">
            <Link href={`/brokers/${company.slug}`} className="flex-1 sm:flex-initial">
              <Button variant="default" size="sm" className="w-full gap-1.5 bg-primary hover:bg-primary/90">
                View Profile
              </Button>
            </Link>
            {company.affiliateUrl && (
              <OutLink href={company.affiliateUrl} sponsored className="flex-1 sm:flex-initial">
                <Button variant="outline" size="sm" className="w-full gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Visit
                </Button>
              </OutLink>
            )}
          </div>
        </div>

        {/* Bottom row with platforms and regulators */}
        {(company.platforms?.length || company.regulators?.length) && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
            {company.platforms && company.platforms.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Platforms:</span>
                <span>{company.platforms.slice(0, 3).join(', ')}{company.platforms.length > 3 && ` +${company.platforms.length - 3}`}</span>
              </div>
            )}
            {company.regulators && company.regulators.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-success" />
                <span>{company.regulationSummary || company.regulators.slice(0, 2).join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
