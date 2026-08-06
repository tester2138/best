'use client'

import { Card } from '@/components/ui/card'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'

export default function TermsPage() {
  return (
    <div className="bg-background">
      {/* Breadcrumbs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Terms of Service' }]} />
        </div>
      </div>

      {/* Header */}
      <section className="border-b border-border py-12 sm:py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 25, 2026</p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Agreement to Terms</h2>
            <p className="mt-3 leading-relaxed">
              By accessing and using this website, you accept and agree to be bound by the terms and provision of this
              agreement. If you do not agree to abide by the above, please do not use this service. BestForex.io
              reserves the right to modify these terms and conditions at any time. Your continued use of the website
              implies your acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Use License</h2>
            <p className="mt-3 leading-relaxed">
              Permission is granted to temporarily download one copy of the materials (information or software) on
              BestForex.io for personal, non-commercial transitory viewing only. This is the grant of a license, not
              a transfer of title, and under this license you may not:
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>• Modifying or copying the materials</li>
              <li>• Using the materials for any commercial purpose or for any public display</li>
              <li>• Attempting to decompile or reverse engineer any software contained on BestForex.io</li>
              <li>• Removing any copyright or other proprietary notations from the materials</li>
              <li>• Transferring the materials to another person or &quot;mirroring&quot; the materials on any other server</li>
              <li>• Using materials to create competing information products or services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Disclaimer</h2>
            <p className="mt-3 leading-relaxed">
              The materials on BestForex.io are provided on an &quot;as is&quot; basis. BestForex.io makes no warranties,
              expressed or implied, and hereby disclaims and negates all other warranties including, without limitation,
              implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement
              of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Limitations</h2>
            <p className="mt-3 leading-relaxed">
              In no event shall BestForex.io or its suppliers be liable for any damages (including, without limitation,
              damages for loss of data or profit, or due to business interruption) arising out of the use or inability
              to use the materials on BestForex.io, even if BestForex.io or a BestForex.io authorized representative has
              been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Accuracy of Materials</h2>
            <p className="mt-3 leading-relaxed">
              The materials appearing on BestForex.io could include technical, typographical, or photographic errors.
              BestForex.io does not warrant that any of the materials on our website are accurate, complete, or current.
              BestForex.io may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Materials and Links</h2>
            <p className="mt-3 leading-relaxed">
              BestForex.io has not reviewed all of the sites linked to its website and is not responsible for the
              contents of any such linked site. The inclusion of any link does not imply endorsement by BestForex.io of
              the site. Use of any such linked website is at the user&apos;s own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Modifications</h2>
            <p className="mt-3 leading-relaxed">
              BestForex.io may revise these terms of service for our website at any time without notice. By using this
              website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Affiliate Disclosure</h2>
            <p className="mt-3 leading-relaxed">
              BestForex.io is a participant in affiliate programs with various brokers and financial service providers.
              When you click on links to these brokers and make an account or trade, we earn affiliate commissions. This
              does not affect your costs and helps support our work in providing unbiased reviews and analysis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. No Professional Advice</h2>
            <p className="mt-3 leading-relaxed">
              The information on BestForex.io is for informational purposes only and should not be construed as
              financial, investment, or trading advice. We are not licensed financial advisors. Always consult with a
              qualified professional before making any investment decisions. Forex trading carries substantial risk of
              loss.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Contact Information</h2>
            <p className="mt-3 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at legal@bestforex.io
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
