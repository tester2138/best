'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Plus, X, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OutLink } from '@/components/ui/out-link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RatingStars } from '@/components/ui/rating-stars'
import { BrokerLogo } from '@/components/brokers/broker-logo'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { brokers } from '@/data/brokers'
import type { Broker } from '@/lib/types'

function regString(reg: Broker['regulators'][number]): string {
  return typeof reg === 'string' ? reg : reg.authority
}

const MAX_COMPARE = 4

export default function ComparePage() {
  const [selectedBrokers, setSelectedBrokers] = useState<Broker[]>([
    brokers[0],
    brokers[1],
    brokers[2]
  ])

  const addBroker = (slug: string) => {
    const broker = brokers.find(b => b.slug === slug)
    if (broker && !selectedBrokers.find(b => b.slug === slug) && selectedBrokers.length < MAX_COMPARE) {
      setSelectedBrokers([...selectedBrokers, broker])
    }
  }

  const removeBroker = (slug: string) => {
    setSelectedBrokers(selectedBrokers.filter(b => b.slug !== slug))
  }

  const availableBrokers = brokers.filter(b => !selectedBrokers.find(s => s.slug === b.slug))

  const breadcrumbItems = [{ label: 'Compare Brokers' }]

  const comparisonFields = [
    { label: 'Overall Rating', key: 'rating' },
    { label: 'Min Deposit', key: 'minDeposit' },
    { label: 'Spreads From', key: 'spreadsFrom' },
    { label: 'Max Leverage', key: 'maxLeverageRetail' },
    { label: 'Headquarters', key: 'headquarters' },
    { label: 'Founded', key: 'foundedYear' },
    { label: 'Currency Pairs', key: 'currencyPairs' }
  ]

  const scoreFields = [
    { label: 'Trust & Safety', key: 'trustSafety' },
    { label: 'Trading Conditions', key: 'tradingConditions' },
    { label: 'Platforms', key: 'platforms' },
    { label: 'Research', key: 'researchEducation' },
    { label: 'Customer Service', key: 'customerService' },
    { label: 'Mobile Trading', key: 'mobileTrading' }
  ]

  return (
    <>
      {/* Header */}
      <section className="bg-secondary/30 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} className="mb-6" />
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            Compare Forex Brokers
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Select up to {MAX_COMPARE} brokers to compare side-by-side
          </p>
        </div>
      </section>

      {/* Broker Selector */}
      <section className="border-b border-border bg-background sticky top-16 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {selectedBrokers.map((broker) => (
              <div 
                key={broker.slug}
                className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg"
              >
                <BrokerLogo name={broker.name} slug={broker.slug} size="sm" />
                <span className="font-medium text-foreground whitespace-nowrap">{broker.name}</span>
                <button
                  onClick={() => removeBroker(broker.slug)}
                  className="p-1 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {selectedBrokers.length < MAX_COMPARE && (
              <Select onValueChange={addBroker}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <SelectValue placeholder="Add broker" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableBrokers.map((broker) => (
                    <SelectItem key={broker.slug} value={broker.slug}>
                      {broker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-8 lg:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {selectedBrokers.length < 2 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Select at least 2 brokers</h2>
              <p className="text-muted-foreground">Use the selector above to add brokers for comparison</p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* Header Row with Broker Cards */}
                <thead>
                  <tr>
                    <th className="p-4 text-left w-48"></th>
                    {selectedBrokers.map((broker) => (
                      <th key={broker.slug} className="p-4 min-w-[200px]">
                        <Card className="p-4 text-center">
                          <BrokerLogo 
                            name={broker.name} 
                            slug={broker.slug} 
                            size="lg" 
                            className="mx-auto mb-3"
                          />
                          <Link href={`/brokers/${broker.slug}`}>
                            <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                              {broker.name}
                            </h3>
                          </Link>
                          <RatingStars 
                            rating={broker.rating} 
                            size="sm" 
                            className="justify-center mt-2" 
                          />
                          <OutLink href={broker.affiliateUrl} sponsored className="block mt-3">
                            <Button size="sm" className="w-full gap-1 bg-primary hover:bg-primary/90">
                              Visit
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </OutLink>
                        </Card>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Basic Info */}
                  <tr className="bg-secondary/30">
                    <td colSpan={selectedBrokers.length + 1} className="p-3 font-semibold text-foreground">
                      Overview
                    </td>
                  </tr>
                  {comparisonFields.map((field) => (
                    <tr key={field.key} className="border-b border-border">
                      <td className="p-4 text-sm text-muted-foreground">{field.label}</td>
                      {selectedBrokers.map((broker) => {
                        const value = broker[field.key as keyof Broker]
                        const displayValue = Array.isArray(value)
                          ? (value as (string | object)[]).map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(', ')
                          : (value !== null && value !== undefined && typeof value === 'object')
                            ? JSON.stringify(value)
                            : (value as string | number | boolean | undefined)?.toString()
                        if (field.key === 'rating') {
                          return (
                            <td key={broker.slug} className="p-4 text-center">
                              <span className="text-lg font-bold text-success">{displayValue}</span>
                              <span className="text-sm text-muted-foreground">/5</span>
                            </td>
                          )
                        }
                        return (
                          <td key={broker.slug} className="p-4 text-center font-medium text-foreground">
                            {displayValue || 'N/A'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  {/* Score Breakdown */}
                  <tr className="bg-secondary/30">
                    <td colSpan={selectedBrokers.length + 1} className="p-3 font-semibold text-foreground">
                      Score Breakdown
                    </td>
                  </tr>
                  {scoreFields.map((field) => (
                    <tr key={field.key} className="border-b border-border">
                      <td className="p-4 text-sm text-muted-foreground">{field.label}</td>
                      {selectedBrokers.map((broker) => {
                        const score = broker.scores[field.key as keyof typeof broker.scores] ?? 0
                        return (
                          <td key={broker.slug} className="p-4">
                            <div className="max-w-[150px] mx-auto">
                              <ProgressBar value={score} max={5} size="sm" />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  {/* Regulation */}
                  <tr className="bg-secondary/30">
                    <td colSpan={selectedBrokers.length + 1} className="p-3 font-semibold text-foreground">
                      Regulation
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 text-sm text-muted-foreground">Regulators</td>
                    {selectedBrokers.map((broker) => (
                      <td key={broker.slug} className="p-4 text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {broker.regulators.slice(0, 3).map((reg) => (
                            <Badge key={regString(reg)} variant="secondary" className="text-xs">
                              {regString(reg).split(' ')[0]}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Platforms */}
                  <tr className="bg-secondary/30">
                    <td colSpan={selectedBrokers.length + 1} className="p-3 font-semibold text-foreground">
                      Platforms
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 text-sm text-muted-foreground">Available Platforms</td>
                    {selectedBrokers.map((broker) => (
                      <td key={broker.slug} className="p-4 text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {broker.platforms.map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Pros */}
                  <tr className="bg-secondary/30">
                    <td colSpan={selectedBrokers.length + 1} className="p-3 font-semibold text-foreground">
                      Key Advantages
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 text-sm text-muted-foreground">Pros</td>
                    {selectedBrokers.map((broker) => (
                      <td key={broker.slug} className="p-4 align-top">
                        <ul className="space-y-1.5">
                          {broker.pros.slice(0, 3).map((pro, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-secondary/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Need Help Choosing?
          </h2>
          <p className="text-muted-foreground mb-6">
            Read our detailed broker reviews or check our methodology to understand how we rate brokers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/brokers">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                View All Brokers
              </Button>
            </Link>
            <Link href="/methodology">
              <Button size="lg" variant="outline">
                Our Methodology
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
