'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Globe, Users, TrendingUp, Target, BarChart3, Mail, Shield, FileText } from 'lucide-react'
import { siteStats, b2bStats } from '@/data/siteStats'
import { AdSlot } from '@/components/ads/ad-slot'

export default function MediaKitPage() {
  return (
    <div className="bg-background">
      {/* Breadcrumbs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Media Kit' }]} />
        </div>
      </div>

      {/* Header */}
      <section className="border-b border-border py-12 sm:py-16 bg-gradient-to-b from-secondary/50 to-background">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Badge variant="secondary" className="mb-4">
            <FileText className="w-4 h-4 mr-1.5" />
            Advertising Information
          </Badge>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            BestForex.io Media Kit
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            Comprehensive advertising information, audience insights, and partnership opportunities for forex brands and brokers.
          </p>
          <div className="mt-6">
            <Link href="#request-kit">
              <Button className="bg-primary hover:bg-primary/90">
                Request Full Media Kit
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Horizontal Banners */}
      <div className="bg-secondary/30 py-3">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AdSlot placementKey="horizontal-1" fluid />
            <AdSlot placementKey="horizontal-2" fluid />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-16">
          {/* BestForex.io Reach */}
          <section>
            <h2 className="text-2xl font-bold text-foreground">BestForex.io Reach</h2>
            <p className="mt-2 text-muted-foreground">Our platform audience and engagement metrics</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-6 text-center">
                <div className="text-4xl font-bold text-primary">{siteStats.monthlyVisitors}</div>
                <p className="mt-2 text-sm text-muted-foreground">{siteStats.monthlyVisitorsLabel}</p>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-4xl font-bold text-primary">{siteStats.followers}</div>
                <p className="mt-2 text-sm text-muted-foreground">{siteStats.followersLabel}</p>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-4xl font-bold text-primary">{siteStats.brokersReviewed}</div>
                <p className="mt-2 text-sm text-muted-foreground">{siteStats.brokersReviewedLabel}</p>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-4xl font-bold text-primary">{b2bStats.highIntentTraffic}</div>
                <p className="mt-2 text-sm text-muted-foreground">{b2bStats.highIntentLabel}</p>
              </Card>
            </div>
          </section>

          {/* Audience Overview */}
          <section>
            <h2 className="text-2xl font-bold text-foreground">Audience Overview</h2>
            <p className="mt-2 text-muted-foreground">Who visits BestForex.io</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="p-6">
                <Users className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-foreground">Trader Demographics</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>Active forex and CFD traders</li>
                  <li>Primary age group: 25-54</li>
                  <li>High net worth individuals</li>
                  <li>Researching broker options</li>
                </ul>
              </Card>
              <Card className="p-6">
                <Globe className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-foreground">Geographic Reach</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>{b2bStats.globalReach} countries worldwide</li>
                  <li>Strong presence in US, UK, EU</li>
                  <li>Growing Asia Pacific audience</li>
                  <li>English-language content</li>
                </ul>
              </Card>
              <Card className="p-6">
                <Target className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-foreground">User Intent</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>{b2bStats.highIntentTraffic} high-intent traffic</li>
                  <li>Active broker comparison</li>
                  <li>Ready to open accounts</li>
                  <li>Researching trading conditions</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* Advertising Placements */}
          <section className="border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-foreground">Advertising Placements</h2>
            <p className="mt-2 text-muted-foreground">Premium placement opportunities across the platform</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <Card className="p-6">
                <h4 className="font-semibold text-foreground">Featured Broker Placements</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Premium positions in broker ranking tables, homepage features, and comparison results.
                </p>
              </Card>
              <Card className="p-6">
                <h4 className="font-semibold text-foreground">Banner Advertising</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Leaderboard, sidebar, and in-content banner placements across high-traffic pages.
                </p>
              </Card>
              <Card className="p-6">
                <h4 className="font-semibold text-foreground">Offer Promotions</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Highlight bonuses, promotions, and special offers in our dedicated offers section.
                </p>
              </Card>
              <Card className="p-6">
                <h4 className="font-semibold text-foreground">Native Content</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sponsored articles, educational content, and branded integrations.
                </p>
              </Card>
            </div>
          </section>

          {/* Banner Specifications */}
          <section className="border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-foreground">Banner Specifications</h2>
            <p className="mt-2 text-muted-foreground">Technical requirements for display advertising</p>
            <div className="mt-8 space-y-4">
              {[
                {
                  title: 'Leaderboard',
                  sizes: ['970x90', '970x250', '728x90'],
                  formats: 'JPG, PNG, GIF, HTML5 (max 150KB)'
                },
                {
                  title: 'Medium Rectangle (MPU)',
                  sizes: ['300x250', '300x600'],
                  formats: 'JPG, PNG, GIF, HTML5 (max 150KB)'
                },
                {
                  title: 'Mobile Banner',
                  sizes: ['320x100', '320x50'],
                  formats: 'JPG, PNG, GIF, HTML5 (max 100KB)'
                }
              ].map((spec, idx) => (
                <Card key={idx} className="p-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <h4 className="font-semibold text-foreground">{spec.title}</h4>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Sizes (px)</p>
                      <p className="font-mono text-sm">{spec.sizes.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Formats</p>
                      <p className="text-sm">{spec.formats}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Additional Opportunities */}
          <section className="border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-foreground">Additional Opportunities</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="p-6">
                <Mail className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground">Newsletter Sponsorship</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Reach our engaged subscriber base with sponsored newsletter placements.
                </p>
              </Card>
              <Card className="p-6">
                <TrendingUp className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground">Social Media</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Amplify your brand across our social media channels and communities.
                </p>
              </Card>
              <Card className="p-6">
                <BarChart3 className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground">Reporting & Tracking</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Comprehensive analytics with impression, click, and conversion tracking.
                </p>
              </Card>
            </div>
          </section>

          {/* Brand Safety */}
          <section className="border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-foreground">Brand Safety & Compliance</h2>
            <div className="mt-8">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <Shield className="w-8 h-8 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Our Commitment</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      BestForex.io maintains strict editorial standards and advertising guidelines. All advertising is clearly disclosed, 
                      and we only partner with regulated, reputable forex brands. Our content and advertising comply with FCA, ASIC, 
                      and other regulatory advertising standards.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Request Media Kit */}
          <section id="request-kit" className="border-t border-border pt-12 scroll-mt-16">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
              <h2 className="text-2xl font-bold text-foreground">Request Full Media Kit</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Get the complete media kit with detailed audience analytics, rate card, 
                case studies, and partnership opportunities.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/contact-us?intent=advertising">
                  <Button className="bg-primary hover:bg-primary/90">
                    Request Media Kit
                  </Button>
                </Link>
                <Link href="/contact-us?intent=partnership">
                  <Button variant="outline">
                    Contact Partnerships
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="border-t border-border pt-12 pb-4 text-center">
            <h2 className="text-xl font-bold text-foreground">Questions About Advertising?</h2>
            <p className="mt-2 text-muted-foreground">
              Our partnership team is ready to help you reach your marketing goals.
            </p>
            <div className="mt-6">
              <Link href="mailto:partnerships@bestforex.io">
                <Button className="bg-primary hover:bg-primary/90">
                  Contact Partnership Team
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
