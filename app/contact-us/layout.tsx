import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the BestForex.io team for partnerships, broker data corrections, press enquiries and general support.',
  alternates: { canonical: '/contact-us' },
  openGraph: {
    title: 'Contact Us | BestForex.io',
    description:
      'Get in touch with the BestForex.io team for partnerships, data corrections and press enquiries.',
    url: '/contact-us',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
