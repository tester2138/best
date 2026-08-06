'use client'

import { Card } from '@/components/ui/card'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'

export default function PrivacyPage() {
  return (
    <div className="bg-background">
      {/* Breadcrumbs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} />
        </div>
      </div>

      {/* Header */}
      <section className="border-b border-border py-12 sm:py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 25, 2026</p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="mt-3 leading-relaxed">
              BestForex.io (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the BestForex.io website. This page
              informs you of our policies regarding the collection, use, and disclosure of personal data when you use
              our Service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Information Collection and Use</h2>
            <p className="mt-3 leading-relaxed">
              We collect several different types of information for various purposes to provide and improve our
              Service to you.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <h3 className="font-semibold">Personal Data:</h3>
                <p className="mt-1 text-sm">
                  While using our Service, we may ask you to provide us with certain personally identifiable
                  information that can be used to contact or identify you (&quot;Personal Data&quot;). This may
                  include:
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Email address</li>
                  <li>• Name</li>
                  <li>• Phone number (optional)</li>
                  <li>• Cookies and usage data</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Usage Data:</h3>
                <p className="mt-1 text-sm">
                  We may also collect information about how you access and use the Service (&quot;Usage Data&quot;).
                  This may include your computer&apos;s Internet Protocol address, browser type, pages visited, time and
                  date stamps, and other diagnostic data.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Cookies</h2>
            <p className="mt-3 leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our Service and hold certain
              information. Cookies are files with small amounts of data that may include an anonymous unique identifier.
              You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Use of Data</h2>
            <p className="mt-3 leading-relaxed">We use the collected data for various purposes:</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>• To provide and maintain our Service</li>
              <li>• To notify you about changes to our Service</li>
              <li>• To allow you to participate in interactive features</li>
              <li>• To provide customer support</li>
              <li>• To gather analysis or valuable information to improve our Service</li>
              <li>• To monitor the usage of our Service</li>
              <li>• To detect, prevent and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Security of Data</h2>
            <p className="mt-3 leading-relaxed">
              The security of your data is important to us but remember that no method of transmission over the
              Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable
              means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Third-Party Links</h2>
            <p className="mt-3 leading-relaxed">
              Our Service may contain links to other sites that are not operated by us. This Privacy Policy applies only
              to our Service, and we are not responsible for the privacy policies of third-party websites. We encourage
              you to review the privacy policies of any third-party services before providing your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Changes to This Privacy Policy</h2>
            <p className="mt-3 leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the &quot;Last updated&quot; date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Contact Us</h2>
            <p className="mt-3 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at privacy@bestforex.io
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
