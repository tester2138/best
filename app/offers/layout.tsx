import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Exclusive Forex Broker Offers & Bonuses',
  description:
    'Browse exclusive, independently verified forex broker offers, deposit bonuses and promotions. Compare the latest deals from regulated brokers.',
  alternates: { canonical: '/offers' },
  openGraph: {
    title: 'Exclusive Forex Broker Offers & Bonuses | BestForex.io',
    description:
      'Browse exclusive, independently verified forex broker offers, deposit bonuses and promotions.',
    url: '/offers',
  },
}

export default function OffersLayout({ children }: { children: React.ReactNode }) {
  return children
}
