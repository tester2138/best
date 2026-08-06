'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Building, 
  Globe, 
  Calendar,
  CreditCard,
  Clock,
  Ban
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Broker } from '@/lib/types'

/** Safely extract a string from a regulator entry — handles both plain strings
 *  and legacy object entries {authority,country,licenseNumber} that may exist
 *  in the raw brokers.ts data before the overlay normalises them. */
function regString(reg: Broker['regulators'][number]): string {
  return typeof reg === 'string' ? reg : reg.authority
}

interface BrokerQuickFactsProps {
  broker: Broker
  className?: string
}

export function BrokerQuickFacts({ broker, className }: BrokerQuickFactsProps) {
  // Rows 42+159: only include facts with real data — no fabricated defaults.
  // A fact is shown only when the value is a non-empty, non-zero truthy string.
  const allFacts = [
    { icon: DollarSign, label: 'Min Deposit', value: broker.minDeposit },
    { icon: TrendingUp, label: 'Spreads From', value: broker.spreadsFrom },
    { icon: Percent, label: 'Max Leverage (Retail)', value: broker.maxLeverageRetail },
    { icon: Building, label: 'Headquarters', value: broker.headquarters },
    { icon: Calendar, label: 'Founded', value: broker.foundedYear?.toString() },
    { icon: Globe, label: 'Currency Pairs', value: broker.currencyPairs },
    { icon: CreditCard, label: 'Commission', value: broker.commissions },
    { icon: Clock, label: 'Withdrawal Time', value: broker.withdrawalTime },
    { icon: Ban, label: 'Inactivity Fee', value: broker.inactivityFee },
  ]
  const facts = allFacts.filter(f => f.value && f.value.trim() !== '' && f.value !== 'N/A')

  // If no facts are available at all, render nothing rather than an empty card.
  if (facts.length === 0 && !broker.regulators?.length && !broker.platforms?.length) {
    return null
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>Quick Facts</CardTitle>
      </CardHeader>
      <CardContent>
        {facts.length > 0 && (
          // Fable5: divide-y instead of space-y + per-row borders so every
          // divider sits at an identical distance; values right-aligned with a
          // guaranteed gap so long entries (e.g. "Copenhagen, Denmark") never
          // collide with their labels.
          <div className="divide-y divide-border">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{label}</span>
                </div>
                <span className="text-sm font-medium text-foreground text-right tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Regulators */}
        {broker.regulators && broker.regulators.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-foreground mb-2">Regulators</p>
            <div className="flex flex-wrap gap-2">
              {broker.regulators.map((reg) => (
                <Badge key={regString(reg)} variant="secondary" className="text-xs">
                  {regString(reg)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Platforms */}
        {broker.platforms && broker.platforms.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-foreground mb-2">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {broker.platforms.map((platform) => (
                <Badge key={platform} variant="outline" className="text-xs">
                  {platform}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
