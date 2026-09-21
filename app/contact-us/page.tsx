// T04: SSR server component wrapper for /contact-us.
// Metadata is exported from app/contact-us/layout.tsx (fixed canonical, no searchParams).
// This file renders indexable static contact-channel text in SSR HTML,
// then mounts the interactive client form below it.

import ContactUsClient from './contact-us-client'

// ─── SSR-visible contact channel directory ────────────────────────────────────
// These email addresses must appear in server-rendered HTML so search engines
// can index the contact channels without executing JavaScript.

const contactChannels = [
  { label: 'General enquiries', email: 'info@bestforex.io', note: 'Fastest response for most enquiries' },
  { label: 'Editorial & corrections', email: 'editorial@bestforex.io', note: 'Content accuracy, author queries, corrections' },
  { label: 'Partnerships & advertising', email: 'partnerships@bestforex.io', note: 'Sponsorships, co-marketing, media packages' },
  { label: 'Privacy & data requests', email: 'privacy@bestforex.io', note: 'GDPR, data removal, cookie queries' },
  { label: 'Legal', email: 'legal@bestforex.io', note: 'Legal notices and compliance matters' },
]

export default function ContactUsPage() {
  return (
    <>
      {/* SSR-rendered contact directory — visible to readers and crawlable without JavaScript */}
      <section className="border-b border-border bg-card" aria-labelledby="contact-channels-heading">
        <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 id="contact-channels-heading" className="text-2xl font-bold text-foreground">
            Contact BestForex.io
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground leading-relaxed">
            BestForex.io is an independent forex broker review and comparison publisher. Use the
            newsroom and business channels below, or the enquiry form on this page, to reach the right team.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Contact channels">
            {contactChannels.map(({ label, email, note }) => (
              <li key={email} className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <a href={`mailto:${email}`} className="mt-1 inline-block text-sm text-primary hover:underline">
                  {email}
                </a>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Interactive form — requires JavaScript */}
      <ContactUsClient />
    </>
  )
}
