'use client'

import Link from 'next/link'
import { ExternalLink, Award, TrendingUp, ChevronRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RatingStars } from '@/components/ui/rating-stars'
import { BrokerLogo } from '@/components/brokers/broker-logo'
import { VerificationBadge } from '@/components/brands/verification-badge'
import { OutLink } from '@/components/ui/out-link'
import { cn } from '@/lib/utils'
import type { Broker } from '@/lib/types'

/** Safely coerce a regulator entry to a display string. */
function regString(reg: Broker['regulators'][number]): string {
  return typeof reg === 'string' ? reg : reg.authority
}

interface BrokerCardProps {
  broker: Broker
  rank?: number
  variant?: 'default' | 'compact' | 'featured'
  className?: string
}

export function BrokerCard({ broker, rank, variant = 'default', className }: BrokerCardProps) {
  if (variant === 'compact') {
    return <BrokerCardCompact broker={broker} rank={rank} className={className} />
  }

  if (variant === 'featured') {
    return <BrokerCardFeatured broker={broker} rank={rank} className={className} />
  }

  // T24: Single responsive markup — no duplicate desktop/mobile blocks.
  // Tailwind breakpoints replace the hidden sm:flex / flex sm:hidden pattern.
  return (
    <Card className={cn(
      'group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20',
      broker.isSponsored && 'border-primary/30 bg-primary/[0.02]',
      className
    )}>
      {broker.isSponsored && (
        <div className="absolute top-0 right-0 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-bl-lg">
          Sponsored
        </div>
      )}

      <CardContent className="p-4 sm:p-5">
        {/* Row 1: Rank + Logo + Name/Rating + CTA (stacks on mobile, row on desktop) */}
        <div className="flex items-start gap-3 sm:gap-4">
          {rank && (
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5',
              rank === 1 && 'bg-success text-success-foreground',
              rank === 2 && 'bg-secondary text-secondary-foreground',
              rank === 3 && 'bg-warning/20 text-warning-foreground',
              rank > 3 && 'bg-muted text-muted-foreground'
            )}>
              {rank}
            </div>
          )}

          <BrokerLogo name={broker.name} slug={broker.slug} logoUrl={broker.logoUrl} websiteUrl={broker.websiteUrl} size="lg" />

          {/* Name + Rating — fills remaining space */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href={`/brokers/${broker.slug}`} className="hover:text-primary transition-colors">
                <h3 className="font-semibold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
                  {broker.name}
                </h3>
              </Link>
              <VerificationBadge
                verificationStatus={broker.verificationStatus ?? 'unverified'}
                isSponsored={broker.isSponsored}
                display="icon"
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <RatingStars rating={broker.rating} size="sm" />
              {broker.ratingLabel && (
                <span className="text-xs text-muted-foreground">{broker.ratingLabel}</span>
              )}
            </div>

            {/* Description — visible on all sizes */}
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {broker.shortDescription}
            </p>

            {/* Badges */}
            {broker.badges && broker.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {broker.badges.slice(0, 3).map((badge) => (
                  <Badge key={badge} variant="secondary" className="text-xs font-normal">
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* CTA column — single DOM, responsive layout (rows 47+130+218) */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <OutLink href={broker.affiliateUrl} sponsored>
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                Visit Broker
                <ExternalLink className="w-4 h-4" />
              </Button>
            </OutLink>
            <Link href={`/brokers/${broker.slug}`}>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                Read Review
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Info row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Min Deposit</p>
            <p className="text-sm font-medium text-foreground">{broker.minDeposit || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Spreads</p>
            <p className="text-sm font-medium text-foreground">{broker.spreadsFrom || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Regulation</p>
            <p className="text-sm font-medium text-foreground truncate" title={broker.regulators?.[0] ? regString(broker.regulators[0]) : 'Multiple'}>
              {broker.regulators?.[0] ? regString(broker.regulators[0]).split(' ')[0] : 'Multiple'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BrokerCardCompact({ broker, rank, className }: BrokerCardProps) {
  return (
    <Card className={cn('group hover:shadow-md transition-all h-full', className)}>
      <CardContent className="p-4 h-full flex items-center">
        <div className="flex items-center gap-3 w-full">
          {rank && (
            <span className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              rank <= 3 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
            )}>
              {rank}
            </span>
          )}
          <BrokerLogo name={broker.name} slug={broker.slug} logoUrl={broker.logoUrl} websiteUrl={broker.websiteUrl} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/brokers/${broker.slug}`}>
                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {broker.name}
                </h4>
              </Link>
              <VerificationBadge
                verificationStatus={broker.verificationStatus ?? 'unverified'}
                isSponsored={broker.isSponsored}
                display="icon"
              />
            </div>
            <div className="flex items-center gap-2">
              <RatingStars rating={broker.rating} size="sm" showValue={false} />
              <span className="text-xs text-muted-foreground">{broker.rating}</span>
            </div>
          </div>
          <OutLink href={broker.affiliateUrl} sponsored>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              Visit
            </Button>
          </OutLink>
        </div>
      </CardContent>
    </Card>
  )
}

function BrokerCardFeatured({ broker, rank, className }: BrokerCardProps) {
  return (
    <Card className={cn(
      'group relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/[0.02] to-transparent',
      className
    )}>
      <div className="absolute top-0 left-0 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-br-xl flex items-center gap-1.5">
        <Award className="w-3.5 h-3.5" />
        Featured Broker
      </div>

      <CardContent className="p-5 sm:p-6 pt-10">
        <div className="flex items-center gap-4 mb-4">
          <BrokerLogo name={broker.name} slug={broker.slug} logoUrl={broker.logoUrl} websiteUrl={broker.websiteUrl} size="lg" className="sm:w-24 sm:h-24" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/brokers/${broker.slug}`}>
                <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {broker.name}
                </h3>
              </Link>
              <VerificationBadge
                verificationStatus={broker.verificationStatus ?? 'unverified'}
                isSponsored={broker.isSponsored}
                display="icon"
              />
            </div>
            <RatingStars rating={broker.rating} size="md" showLabel label={broker.ratingLabel} />
          </div>
        </div>

        <p className="text-sm sm:text-base text-muted-foreground mb-4 line-clamp-2">{broker.shortDescription}</p>

        {broker.badges && broker.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
            {broker.badges.slice(0, 3).map((badge) => (
              <Badge key={badge} className="bg-primary/10 text-primary border-0 text-xs">
                {badge}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 p-3 sm:p-4 bg-secondary/50 rounded-xl">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-success flex-shrink-0" />
            <span className="text-xs sm:text-sm truncate">{broker.regulators?.[0] ? regString(broker.regulators[0]) : 'Regulated'}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success flex-shrink-0" />
            <span className="text-xs sm:text-sm">From {broker.spreadsFrom}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <OutLink href={broker.affiliateUrl} sponsored className="flex-1">
            <Button className="w-full gap-2 bg-primary hover:bg-primary/90 h-11">
              Visit Broker
              <ExternalLink className="w-4 h-4" />
            </Button>
          </OutLink>
          <Link href={`/brokers/${broker.slug}`}>
            <Button variant="outline" className="w-full sm:w-auto gap-1 h-10">
              Review
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
