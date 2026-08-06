import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Risk Disclaimer',
  description:
    'Important risk disclaimer for BestForex.io. Trading forex and CFDs carries a high level of risk. Read before using our content or following any broker links.',
  alternates: { canonical: '/disclaimer' },
  openGraph: {
    title: 'Risk Disclaimer | BestForex.io',
    description: 'Important risk disclosure for trading forex and CFDs.',
    url: '/disclaimer',
  },
}

export default function DisclaimerLayout({ children }: { children: React.ReactNode }) {
  return children
}
