import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Our Review Methodology',
  description:
    'How BestForex.io rates and reviews forex brokers: our scoring framework, data sources, regulation checks and editorial independence policy.',
  alternates: { canonical: '/methodology' },
  openGraph: {
    title: 'Our Review Methodology | BestForex.io',
    description:
      'How BestForex.io rates and reviews forex brokers: scoring framework, data sources and editorial independence.',
    url: '/methodology',
  },
}

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return children
}
