'use client'

import { Card } from '@/components/ui/card'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'

export default function MethodologyPage() {
  return (
    <div className="bg-background">
      {/* Breadcrumbs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Methodology' }]} />
        </div>
      </div>

      {/* Header */}
      <section className="border-b border-border py-12 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Our Methodology
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            How we evaluate and rate forex brokers to help you make informed decisions.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {/* Introduction */}
          <section>
            <p className="text-foreground leading-relaxed">
              At BestForex.io, our mission is to provide transparent, unbiased, and comprehensive reviews of forex
              brokers. Our methodology is built on rigorous research, real-world testing, and continuous verification
              of broker claims. Every rating is based on factual data and years of industry experience.
            </p>
          </section>

          {/* Evaluation Criteria */}
          <section>
            <h2 className="text-2xl font-bold text-foreground">Evaluation Criteria</h2>
            <div className="mt-8 space-y-6">
              {[
                {
                  title: 'Regulation & Licensing',
                  description:
                    'We verify regulatory status with appropriate financial authorities (FCA, ASIC, CySEC, etc.). A valid license is non-negotiable. We check for any regulatory violations or disciplinary actions.',
                  weight: '25%'
                },
                {
                  title: 'Trading Platforms',
                  description:
                    'We test trading platforms for functionality, speed, and reliability. We evaluate available tools, charting capabilities, and mobile apps. User experience and accessibility are key factors.',
                  weight: '15%'
                },
                {
                  title: 'Spreads & Commissions',
                  description:
                    'We compare live spreads on major currency pairs (EUR/USD, GBP/USD, etc.). We analyze commission structures and hidden fees. We benchmark against industry averages.',
                  weight: '20%'
                },
                {
                  title: 'Customer Support',
                  description:
                    'We test customer support across multiple channels (email, chat, phone). We measure response times and quality of assistance. Multilingual support is a plus.',
                  weight: '10%'
                },
                {
                  title: 'Account Types & Minimum Deposit',
                  description:
                    'We evaluate the variety of account options available. We assess minimum deposit requirements and whether they are competitive. We check leverage limits and margin requirements.',
                  weight: '10%'
                },
                {
                  title: 'Educational Resources',
                  description:
                    'We review webinars, tutorials, trading guides, and market analysis. We assess the quality and relevance of educational content. We check availability in multiple languages.',
                  weight: '8%'
                },
                {
                  title: 'Trading Instruments',
                  description:
                    'We verify the number of currency pairs offered. We check availability of CFDs, commodities, indices, and cryptocurrencies. Diversity of offerings is important.',
                  weight: '7%'
                },
                {
                  title: 'Bonuses & Promotions',
                  description:
                    'We examine bonus terms and conditions carefully. We verify compliance with regulations. We assess fairness and real value to traders.',
                  weight: '5%'
                }
              ].map((criterion, idx) => (
                <Card key={idx} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{criterion.title}</h4>
                      <p className="mt-2 text-sm text-muted-foreground">{criterion.description}</p>
                    </div>
                    <div className="flex-shrink-0 rounded-lg bg-primary/10 px-3 py-1 text-right">
                      <div className="text-sm font-bold text-primary">{criterion.weight}</div>
                      <div className="text-xs text-muted-foreground">Weight</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Rating Scale */}
          <section className="border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-foreground">Rating Scale</h2>
            <div className="mt-8 space-y-4">
              {[
                {
                  score: '4.5 - 5.0',
                  label: 'Excellent',
                  description: 'Outstanding broker with superior features and service'
                },
                {
                  score: '4.0 - 4.4',
                  label: 'Very Good',
                  description: 'Strong broker with few areas for improvement'
                },
                {
                  score: '3.5 - 3.9',
                  label: 'Good',
                  description: 'Solid broker with some competitive advantages and minor drawbacks'
                },
                {
                  score: '3.0 - 3.4',
                  label: 'Average',
                  description: 'Acceptable broker but several areas could be improved'
                },
                {
                  score: 'Below 3.0',
                  label: 'Below Average',
                  description: 'Broker has significant limitations or concerns'
                }
              ].map((rating, idx) => (
                <Card key={idx} className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-primary">{rating.score}</div>
                      <h4 className="font-semibold text-foreground">{rating.label}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{rating.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Our Process */}
          <section className="border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-foreground">Our Review Process</h2>
            <div className="mt-8 space-y-4">
              {[
                {
                  step: 1,
                  title: 'Research',
                  description:
                    'We gather comprehensive data on broker history, team, funding, and market position.'
                },
                {
                  step: 2,
                  title: 'Testing',
                  description: 'We open live accounts and test trading platforms, execution speed, and support.'
                },
                {
                  step: 3,
                  title: 'Verification',
                  description: 'We verify regulatory status, financial stability, and security measures.'
                },
                {
                  step: 4,
                  title: 'Analysis',
                  description: 'We analyze costs, instruments, tools, and overall value proposition.'
                },
                {
                  step: 5,
                  title: 'Scoring',
                  description: 'We apply our evaluation criteria and calculate weighted scores.'
                },
                {
                  step: 6,
                  title: 'Review',
                  description:
                    'We write detailed reviews with honest pros, cons, and recommendations.'
                },
                {
                  step: 7,
                  title: 'Updates',
                  description:
                    'We monitor brokers continuously and update reviews quarterly or when significant changes occur.'
                }
              ].map((process, idx) => (
                <Card key={idx} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {process.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{process.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{process.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Independence & Disclosure */}
          <section className="border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-foreground">Independence & Transparency</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <Card className="p-6">
                <h4 className="font-semibold text-foreground">No Conflicts of Interest</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  We do not accept payments from brokers for favorable reviews. Our ratings are based solely on
                  objective criteria and real user experiences.
                </p>
              </Card>
              <Card className="p-6">
                <h4 className="font-semibold text-foreground">Affiliate Relationships</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  We are transparent about affiliate partnerships. We receive commissions from broker sign-ups but
                  this does not influence our ratings or reviews.
                </p>
              </Card>
              <Card className="p-6">
                <h4 className="font-semibold text-foreground">Continuous Monitoring</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  We continuously monitor brokers for changes in fees, platforms, regulations, and service quality. We
                  update reviews regularly to reflect current conditions.
                </p>
              </Card>
              <Card className="p-6">
                <h4 className="font-semibold text-foreground">Community Feedback</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  We welcome user feedback and consider verified trader experiences. User reviews help us identify
                  emerging issues and strengths.
                </p>
              </Card>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="border-t border-border pt-12">
            <Card className="border-primary/20 bg-primary/5 p-6">
              <h3 className="font-semibold text-foreground">Important Disclaimer</h3>
              <p className="mt-4 text-sm text-foreground leading-relaxed">
                This website is for informational purposes only and should not be construed as financial advice. Forex
                trading carries substantial risk of loss. We recommend doing your own research and consulting with a
                financial advisor before trading. Past performance is not indicative of future results. Always trade
                responsibly and only with money you can afford to lose.
              </p>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
