import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compare Forex Brokers Side by Side',
  description:
    'Compare forex brokers head-to-head on regulation, spreads, platforms, minimum deposits and ratings. Build your own comparison to find the right broker.',
  alternates: { canonical: '/compare' },
  openGraph: {
    title: 'Compare Forex Brokers Side by Side | BestForex.io',
    description:
      'Compare forex brokers head-to-head on regulation, spreads, platforms, minimum deposits and ratings.',
    url: '/compare',
  },
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children
}
