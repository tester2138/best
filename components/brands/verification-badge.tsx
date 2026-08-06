'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { VerificationStatus } from '@/lib/directory-types'

// ─── Badge variant types ───────────────────────────────────────────────────────

type BadgeVariant = 'verified' | 'unverified' | 'sponsored'

/**
 * Returns an ordered array of badge variants to render.
 * Sponsored brands always also show Verified — two badges side by side.
 */
function resolveBadgeVariants(
  status: VerificationStatus,
  isSponsored: boolean
): BadgeVariant[] {
  if (isSponsored || status === 'sponsored') {
    return ['sponsored', 'verified']
  }
  if (status === 'verified' || status === 'claimed') {
    return ['verified']
  }
  // under-review, partially-verified, unverified → all show as unverified
  return ['unverified']
}

// ─── Badge configuration ───────────────────────────────────────────────────────

type BadgeConfig = {
  label: string
  tooltipTitle: string
  tooltipBody: string
  icon: React.FC<{ className?: string }>
  pillClass: string
  iconClass: string
  ringClass: string
}

const BADGE_CONFIG: Record<BadgeVariant, BadgeConfig> = {
  verified: {
    label: 'Verified',
    tooltipTitle: 'Verified Brand',
    tooltipBody:
      'This broker has been independently reviewed and confirmed by the BestForex.io editorial team. Information is accurate and regularly updated. Verified brands are considered trustworthy based on our editorial assessment.',
    icon: VerifiedIcon,
    pillClass: 'bg-blue-500/10 text-blue-600 border border-blue-500/25',
    iconClass: 'text-blue-500',
    ringClass: 'ring-blue-400/40',
  },
  unverified: {
    label: 'Unverified',
    tooltipTitle: 'Unverified Brand',
    tooltipBody:
      'This brand has not been independently reviewed or verified by BestForex.io. We cannot confirm the accuracy of this listing. Exercise caution when considering this broker. To claim and verify your profile, contact us at contact@bestforex.io.',
    icon: UnverifiedIcon,
    pillClass: 'bg-red-500/10 text-red-600 border border-red-500/25',
    iconClass: 'text-red-500',
    ringClass: 'ring-red-400/40',
  },
  sponsored: {
    label: 'Sponsored',
    tooltipTitle: 'Sponsored',
    tooltipBody:
      "This broker is a featured partner of BestForex.io and an Editor's Choice selection. Sponsored partners receive premium placement. All editorial reviews and ratings remain independent and objective. Sponsorship does not influence scores or editorial opinion.",
    icon: SponsoredIcon,
    pillClass: 'bg-amber-400/10 text-amber-700 border border-amber-400/30',
    iconClass: 'text-amber-500',
    ringClass: 'ring-amber-400/40',
  },
}

// ─── Custom SVG icons ──────────────────────────────────────────────────────────

/** Blue verified tick — filled circle with checkmark (Twitter / LinkedIn style) */
function VerifiedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm3.53 6.22a.75.75 0 0 0-1.06-1.06L9 10.19 7.53 8.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4-4Z"
      />
    </svg>
  )
}

/** Red warning — circle with exclamation mark */
function UnverifiedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM10 5.75a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Zm0 7.5a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75Z"
      />
    </svg>
  )
}

/** Gold star — Editor's Choice / Sponsored */
function SponsoredIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 0 0 .95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 0 0-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 0 0-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 0 0-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 0 0 .95-.69L9.049 2.927Z" />
    </svg>
  )
}

// ─── Single badge atom ─────────────────────────────────────────────────────────

interface SingleBadgeProps {
  variant: BadgeVariant
  display: 'icon' | 'pill'
  className?: string
}

function SingleBadge({ variant, display, className }: SingleBadgeProps) {
  const config = BADGE_CONFIG[variant]
  const Icon = config.icon

  return (
    <TooltipProvider delayDuration={180}>
      <Tooltip>
        <TooltipTrigger asChild>
          {display === 'pill' ? (
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                'cursor-default select-none transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                config.pillClass,
                className
              )}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {config.label}
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center rounded-full p-0',
                'cursor-default select-none transition-opacity hover:opacity-75 focus:outline-none',
                'ring-2',
                config.ringClass,
                className
              )}
              aria-label={`${config.label} brand`}
            >
              <Icon className={cn('w-4 h-4', config.iconClass)} />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-center leading-relaxed">
          <p className="font-semibold mb-0.5">{config.tooltipTitle}</p>
          <p className="text-xs opacity-90">{config.tooltipBody}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Public component ──────────────────────────────────────────────────────────

interface VerificationBadgeProps {
  verificationStatus: VerificationStatus
  isSponsored?: boolean
  /**
   * "icon"  — icon only, used in listing cards and broker cards beside the name
   * "pill"  — icon + label text in a coloured pill, used on profile pages beside H1
   */
  display?: 'icon' | 'pill'
  className?: string
}

export function VerificationBadge({
  verificationStatus,
  isSponsored = false,
  display = 'icon',
  className,
}: VerificationBadgeProps) {
  const variants = resolveBadgeVariants(verificationStatus, isSponsored)

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {variants.map((variant) => (
        <SingleBadge key={variant} variant={variant} display={display} />
      ))}
    </span>
  )
}
