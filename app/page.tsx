import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, TrendingUp, Shield, Award, Sparkles, ChevronRight, Users, Globe, BarChart3, Clock, ExternalLink, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrokerCard } from '@/components/brokers/broker-card'
import { BrokerLogo } from '@/components/brokers/broker-logo'
import { OutLink } from '@/components/ui/out-link'
import { RatingStars } from '@/components/ui/rating-stars'
import { AdSlot } from '@/components/ads/ad-slot'
import { ItemListSchema } from '@/components/seo/item-list-schema'
import { getPublicFeaturedBrokers, getPublicTopBrokers } from '@/lib/public-brokers'
import { getFeaturedOffers } from '@/data/offers'
import { getLatestPosts } from '@/data/posts'
import { brokerLogoStrip } from '@/data/navigation'
import { heroStats } from '@/data/siteStats'
import type { Metadata } from 'next'

// Scheduling: re-render hourly so the homepage "latest posts" strip picks up
// scheduled articles on their date. getLatestPosts only returns published posts.
export const revalidate = 3600

export const metadata: Metadata = {
  // Row 33: keyword-first title — brand suffix appended by root layout template.
  title: 'Best Forex Brokers 2026: Compare 1,800+ Regulated Platforms',
  // Row 34: trimmed to ≤155 chars.
  description:
    'Compare 1,800+ forex brokers side by side. Independent ratings, regulation checks, spreads and exclusive offers — find the right broker in minutes.',
  alternates: { canonical: '/' },
}

export default async function HomePage() {
  const [topBrokers, featuredBrokers] = await Promise.all([
    getPublicTopBrokers(5),
    getPublicFeaturedBrokers(2),
  ])
  const featuredOffers = getFeaturedOffers().slice(0, 3)
  const latestPosts = await getLatestPosts(4)

  return (
    <div className="flex flex-col">
      <ItemListSchema items={topBrokers} />
      {/* Top Horizontal Banners - Two Side by Side (468x60 each) */}
      <div className="bg-secondary/30 py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AdSlot placementKey="horizontal-1" fluid />
            <AdSlot placementKey="horizontal-2" fluid />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary/50 to-background pt-6 pb-16 lg:pt-10 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left Column - Copy */}
            <div className="text-center lg:text-left">
              <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
                <TrendingUp className="w-4 h-4 mr-1.5 text-primary" />
                Live Broker Rankings
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
                Compare The Best{' '}
                <span className="text-primary">Forex Brokers</span>
              </h1>
              
              <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 text-pretty">
                BestForex.io helps traders compare forex brokers, offers and trading platforms while giving forex brands access to a global audience of {heroStats.stat2.value} followers and subscribers.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link href="/contact-us?intent=advertising">
                  <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-base px-8">
                    Grow Your Business
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/compare">
                  <Button size="lg" variant="outline" className="gap-2 text-base">
                    Compare Forex Brokers
                  </Button>
                </Link>
              </div>
              
              <div className="mt-3">
                <Link href="/media-kit" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                  View Media Kit
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Trust Stats */}
              <div className="mt-10 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-foreground">{heroStats.stat1.value}</p>
                  <p className="text-sm text-muted-foreground">{heroStats.stat1.label}</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-foreground">{heroStats.stat2.value}</p>
                  <p className="text-sm text-muted-foreground">{heroStats.stat2.label}</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-foreground">{heroStats.stat3.value}</p>
                  <p className="text-sm text-muted-foreground">{heroStats.stat3.label}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 rounded-3xl" />
              <div className="relative bg-card border border-border rounded-3xl shadow-xl p-6">
                {/* Mini Dashboard Visual */}
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-foreground text-base">Top Rated Brokers</h2>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Live Rankings
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {topBrokers.slice(0, 3).map((broker, idx) => (
                    <div key={broker.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </span>
                      <BrokerLogo
                        name={broker.name}
                        slug={broker.slug}
                        logoUrl={broker.logoUrl}
                        websiteUrl={broker.websiteUrl}
                        size="sm"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{broker.name}</p>
                        <RatingStars rating={broker.rating} size="sm" showValue={false} />
                      </div>
                      <span className="text-primary font-semibold">{broker.rating}</span>
                    </div>
                  ))}
                </div>

                {/* Chart Visual */}
                <div className="mt-5 h-28 bg-gradient-to-r from-primary/5 to-primary/15 rounded-xl flex items-end justify-around px-4 pb-4">
                  {[40, 65, 55, 80, 70, 90, 85].map((h, i) => (
                    <div
                      key={i}
                      className="w-5 bg-primary/50 rounded-t-md transition-all hover:bg-primary"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Trust Strip */}
      <section className="py-6 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-foreground mb-5">
            Brokers Covered On BestForex.io
          </p>
          <div className="flex items-center justify-center gap-6 lg:gap-10 flex-wrap">
            {brokerLogoStrip.map((broker) => (
              <Link 
                key={broker.slug} 
                href={broker.href} 
                className="opacity-80 hover:opacity-100 transition-opacity group"
              >
                <BrokerLogo name={broker.name} slug={broker.slug} size="lg" className="group-hover:scale-105 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Brokers */}
      <section className="py-12 lg:py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-4">
              <Award className="w-4 h-4 mr-1.5" />
              Featured Partners
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-balance">
              Top-Rated Forex Brokers
            </h2>
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
              Handpicked brokers that excel in trading conditions, regulation, and customer service.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {featuredBrokers.map((broker) => (
              <BrokerCard key={broker.id} broker={broker} variant="featured" />
            ))}
          </div>

          <div className="text-center">
            <Link href="/brokers">
              <Button variant="outline" size="lg" className="gap-2">
                View All Brokers
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Banner After Featured Brokers - Two Horizontal Banners (468x60 each) */}
      <div className="bg-secondary/20 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AdSlot placementKey="horizontal-1" fluid />
            <AdSlot placementKey="horizontal-2" fluid />
          </div>
        </div>
      </div>

      {/* Broker Rankings Table with Sidebar */}
      <section className="py-12 lg:py-16 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <div className="flex-1">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                    Best Forex Brokers
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Our expert rankings based on rigorous testing and analysis
                  </p>
                </div>
                <Link href="/methodology">
                  <Button variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
                    Our Methodology
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-4">
                {topBrokers.map((broker, idx) => (
                  <BrokerCard key={broker.id} broker={broker} rank={idx + 1} />
                ))}
              </div>

              <div className="mt-8 text-center">
                <Link href="/brokers">
                  <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
                    See Full Rankings
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Desktop Sidebar Ads - Two 300x250 banners */}
            <div className="hidden lg:block w-[300px] flex-shrink-0">
              <div className="sticky top-20 space-y-4">
                <AdSlot placementKey="square-1" />
                <AdSlot placementKey="square-2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Banner Before Offers - Two Horizontal Banners (468x60 each) */}
      <div className="bg-background py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AdSlot placementKey="horizontal-1" fluid />
            <AdSlot placementKey="horizontal-2" fluid />
          </div>
        </div>
      </div>

      {/* Latest Offers */}
      <section className="py-12 lg:py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
            <div>
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Featured Promotions
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                Featured Forex Broker Offers
              </h2>
              <p className="mt-2 text-muted-foreground">
                Exclusive bonuses and promotions from top brokers, promoted to high-intent traders
              </p>
            </div>
            <Link href="/offers">
              <Button variant="outline" className="gap-1">
                All Offers
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredOffers.map((offer) => (
              <Card key={offer.id} className={`group hover:shadow-lg transition-all ${offer.isExclusive ? 'border-primary/30' : ''}`}>
                {offer.isExclusive && (
                  <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 text-center">
                    Exclusive Offer
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <BrokerLogo name={offer.brokerName} slug={offer.brokerId} size="md" />
                    <div>
                      <h3 className="font-semibold text-foreground">{offer.brokerName}</h3>
                      <Badge variant="secondary" className="text-xs">{offer.type}</Badge>
                    </div>
                  </div>
                  
                  <h4 className="font-bold text-lg text-foreground mb-2">{offer.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{offer.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{offer.value}</span>
                    <OutLink href={offer.affiliateUrl} sponsored>
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        Claim Offer
                      </Button>
                    </OutLink>
                  </div>
                  
                  {offer.terms && (
                    <p className="mt-3 text-xs text-muted-foreground">{offer.terms}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* B2B CTA for Offers */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">Are you a forex broker?</p>
            <Link href="/contact-us?intent=advertising">
              <Button variant="outline" size="sm" className="gap-2">
                <Megaphone className="w-4 h-4" />
                List Your Offer
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Latest News/Blog */}
      <section className="py-12 lg:py-16 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                Latest Forex News & Analysis
              </h2>
              <p className="mt-2 text-muted-foreground">
                Stay informed with expert market insights and trading guides
              </p>
            </div>
            <Link href="/news">
              <Button variant="outline" className="gap-1">
                All Articles
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {latestPosts.map((post) => (
              <Card key={post.id} className="group overflow-hidden hover:shadow-lg transition-all">
                <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                  {post.featuredImage ? (
                    <Image
                      src={post.featuredImage}
                      alt={post.imageAltText ?? post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <BarChart3 className="w-12 h-12 text-primary/30" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{post.category}</Badge>
                    <span className="text-xs text-muted-foreground">{post.readingTime}</span>
                  </div>
                  <Link href={`/news/${post.slug}`}>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* T31: B2B advertising sections moved to /media-kit. Compact callout only. */}
      <section className="py-10 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-5">
            <div>
              <p className="font-semibold text-foreground">Advertise with BestForex.io</p>
              <p className="text-sm text-muted-foreground">Reach active forex traders through rankings, profiles and banner placements.</p>
            </div>
            <Link href="/media-kit" className="shrink-0">
              <Button variant="outline" className="gap-2">
                View Media Kit
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Horizontal Banners */}
      <div className="bg-secondary/20 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AdSlot placementKey="horizontal-1" fluid />
            <AdSlot placementKey="horizontal-2" fluid />
          </div>
        </div>
      </div>

      {/* Dual CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Traders */}
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <BarChart3 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Ready to Compare Forex Brokers?
              </h3>
              <p className="text-muted-foreground mb-6">
                Compare spreads, regulation, and features side-by-side. Make an informed decision in minutes.
              </p>
              <Link href="/compare">
                <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto">
                  <Sparkles className="w-5 h-5" />
                  Compare Brokers Now
                </Button>
              </Link>
            </div>

            {/* For Brands */}
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Globe className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Want Your Forex Brand To Be Seen?
              </h3>
              <p className="text-muted-foreground mb-6">
                Reach {heroStats.stat2.value} forex traders through premium placements, rankings, and native content.
              </p>
              <Link href="/contact-us?intent=advertising">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  <Megaphone className="w-5 h-5" />
                  Grow Your Business
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
