'use client'

import { Card } from '@/components/ui/card'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'

export default function DisclaimerPage() {
  return (
    <div className="bg-background">
      {/* Breadcrumbs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Disclaimer' }]} />
        </div>
      </div>

      {/* Header */}
      <section className="border-b border-border py-12 sm:py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-foreground">Disclaimer</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 25, 2026</p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8 text-foreground">
          <Card className="border-primary/20 bg-primary/5 p-6">
            <p className="font-semibold text-foreground">
              IMPORTANT: Please read this disclaimer carefully before using BestForex.io. This website provides
              information about forex brokers for educational and informational purposes only.
            </p>
          </Card>

          <section>
            <h2 className="text-xl font-semibold">1. No Investment Advice</h2>
            <p className="mt-3 leading-relaxed">
              The content on BestForex.io, including reviews, ratings, and comparisons, is for informational purposes
              only and does not constitute investment advice, financial advice, or a recommendation to buy or sell any
              particular broker or trading instrument. We are not licensed financial advisors or brokers ourselves.
            </p>
            <p className="mt-3 leading-relaxed">
              Before opening an account with any forex broker or engaging in any trading activities, you should conduct
              your own research and consult with a qualified, licensed financial advisor who understands your personal
              financial situation and risk tolerance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Risk of Trading</h2>
            <p className="mt-3 leading-relaxed">
              Forex trading, and trading of other financial instruments, carries substantial risk of loss. Forex trading
              involves leverage, which can magnify both gains and losses. It is possible to lose more than your initial
              investment. Past performance is not indicative of future results.
            </p>
            <p className="mt-3 leading-relaxed">
              If you decide to trade, you should only use money that you can afford to lose. Trading should only be
              conducted by individuals who have sufficient knowledge, experience, and financial capacity to understand
              and bear the risks involved.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Accuracy of Information</h2>
            <p className="mt-3 leading-relaxed">
              While we strive to provide accurate and up-to-date information, BestForex.io does not guarantee that all
              information on this website is accurate, complete, or current. Broker fees, spreads, leverage limits, and
              regulatory status can change frequently and without notice.
            </p>
            <p className="mt-3 leading-relaxed">
              You should verify all information directly with the broker before opening an account or conducting any
              trades. We are not responsible for any inaccuracies, errors, or omissions on this website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. No Guarantees</h2>
            <p className="mt-3 leading-relaxed">
              BestForex.io makes no warranties or guarantees regarding the accuracy, completeness, timeliness, or
              reliability of the information provided. We do not guarantee any particular trading results, returns, or
              outcomes. Your trading success or failure depends on many factors beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Affiliate Relationships</h2>
            <p className="mt-3 leading-relaxed">
              BestForex.io earns affiliate commissions when users open accounts with brokers through our website. This
              does not influence our ratings or reviews, which are based on objective criteria. However, you should be
              aware of this relationship when using our site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Third-Party Links</h2>
            <p className="mt-3 leading-relaxed">
              This website contains links to third-party websites, including broker websites. BestForex.io is not
              responsible for the content, accuracy, or practices of these external sites. Your use of third-party
              websites is at your own risk and subject to their terms of service and privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Geographical Restrictions</h2>
            <p className="mt-3 leading-relaxed">
              Forex brokers and the trading of certain instruments may be restricted or prohibited in some countries or
              regions. It is your responsibility to ensure that you comply with all applicable laws and regulations in
              your jurisdiction before opening an account or trading. BestForex.io does not verify whether brokers are
              available in your location.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Regulatory Compliance</h2>
            <p className="mt-3 leading-relaxed">
              Regulatory statuses can change frequently and without notice. We are not responsible for
              verifying the current regulatory status or compliance of any broker at any given time. You should
              independently verify that any broker you choose to trade with is properly regulated and licensed in a
              jurisdiction that you are comfortable with.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
            <p className="mt-3 leading-relaxed">
              In no event shall BestForex.io, its owners, employees, or affiliates be liable for any direct, indirect,
              incidental, special, or consequential damages arising out of or in any way connected with your use of this
              website or any broker or trading platform linked from this website, including but not limited to damages
              from loss of profits, loss of data, or business interruption.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Changes to Disclaimer</h2>
            <p className="mt-3 leading-relaxed">
              BestForex.io reserves the right to modify this disclaimer at any time. Your continued use of the website
              constitutes your acceptance of any changes or modifications.
            </p>
          </section>

          <section className="border-t border-border pt-8">
            <h2 className="text-xl font-semibold">Contact Information</h2>
            <p className="mt-3 leading-relaxed">
              If you have questions about this disclaimer, please contact us at legal@bestforex.io
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
