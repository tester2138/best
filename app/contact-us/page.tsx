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
      {/* SSR-rendered contact channel directory — indexable by search engines */}
      <section className="sr-only" aria-label="Contact channels">
        <h2>Contact BestForex.io</h2>
        <p>
          BestForex.io is an independent forex broker review and comparison platform.
          Use the channels below or the enquiry form on this page to reach the right team.
        </p>
        <ul>
          {contactChannels.map(({ label, email, note }) => (
            <li key={email}>
              <strong>{label}:</strong>{' '}
              <a href={`mailto:${email}`}>{email}</a> — {note}
            </li>
          ))}
        </ul>
      </section>

      {/* Interactive form — requires JavaScript */}
      <ContactUsClient />
    </>
  )
}
