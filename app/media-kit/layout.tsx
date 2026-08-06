import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Advertise with BestForex.io | Media Kit',
  description:
    'Reach 1M+ monthly forex traders. Explore ad placements, sponsorship packages and audience data for your forex or trading brand on BestForex.io.',
  alternates: { canonical: '/media-kit' },
  openGraph: {
    title: 'Advertise with BestForex.io | Media Kit',
    description:
      'Reach 1M+ monthly forex traders. Explore ad placements, sponsorship packages and audience data.',
    url: '/media-kit',
    type: 'website',
  },
}

export default function MediaKitLayout({ children }: { children: React.ReactNode }) {
  return children
}
