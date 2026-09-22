'use client'

import { Sparkles, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { OutLink } from '@/components/ui/out-link'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/layout/breadcrumbs'
import { AdSlot } from '@/components/ads/ad-slot'
import { offers } from '@/data/offers'
import { BrokerLogo } from '@/components/brokers/broker-logo'
import { SITE_URL } from '@/lib/site-config'
import Link from 'next/link'

const offersSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Forex Broker Offers & Bonuses',
  itemListElement: offers.map((offer, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    item: {
      '@type': 'Offer',
      name: offer.title,
      description: offer.description,
      category: offer.type,
      url: `${SITE_URL}/brokers/${offer.brokerId}`,
      ...(offer.expiresAt && { validThrough: offer.expiresAt }),
      seller: { '@type': 'Organization', name: offer.brokerName },
    },
  })),
}

export default function OffersPage() {
  return (
    <div className="bg-background">
      <BreadcrumbSchema items={[{ label: 'Offers' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offersSchema) }}
      />
      {/* Top Horizontal Banners (468x60 each) */}
      <div className="bg-secondary/30 py-3">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AdSlot placementKey="horizontal-1" fluid priority />
            <AdSlot placementKey="horizontal-2" fluid priority />
          </div>
        </div>
      </div>

      {/* Header */}
      <section className="border-b border-border py-8 sm:py-12">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Offers' }]} className="mb-4" />
          
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="w-4 h-4 mr-1.5 text-primary" />
            Featured Promotions
          </Badge>
          
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Forex Broker Offers
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Exclusive bonuses and promotions from top brokers
          </p>
          
          <div className="mt-4">
            <Link href="/brokers" className="inline-flex items-center text-sm text-primary hover:underline gap-1">
              All Offers
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Offers Grid */}
          <div className="lg:col-span-2">
            <div className="grid gap-6 sm:grid-cols-2">
              {offers.map((offer) => (
                <Card key={offer.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                    <BrokerLogo name={offer.brokerName} slug={offer.brokerId} size="sm" />
                    <div className="min-w-0">
                      <Link href={`/brokers/${offer.brokerId}`}>
                        <h3 className="font-semibold text-foreground hover:text-primary transition-colors truncate">
                          {offer.brokerName}
                        </h3>
                      </Link>
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {offer.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 px-5 py-4">
                    <div>
                      <h4 className="font-semibold text-foreground">{offer.title}</h4>
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                    </div>
                    <div className="mt-auto pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-bold text-primary">{offer.value}</span>
                      </div>
                      <OutLink href={offer.affiliateUrl} sponsored className="block">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11">
                          Claim Offer
                        </Button>
                      </OutLink>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-2 text-xs text-muted-foreground">
                    {offer.terms && <span>{offer.terms}</span>}
                    {offer.expiresAt && (
                      <span>Expires {new Date(offer.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar - Two 300x250 banners */}
          <div className="flex flex-col gap-6">
            <AdSlot placementKey="square-1" />
            <AdSlot placementKey="square-2" />
          </div>
        </div>

        {/* B2B CTA */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-bold text-foreground">Are You a Forex Broker?</h2>
          <p className="mt-2 text-muted-foreground">
            List your bonuses and promotions on BestForex.io to reach active traders.
          </p>
          <div className="mt-6">
            <Link href="/contact-us?intent=advertising">
              <Button className="bg-primary hover:bg-primary/90">
                List Your Broker Offer
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
