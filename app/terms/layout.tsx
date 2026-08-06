import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms and conditions governing your use of BestForex.io, including acceptable use, disclaimers and limitations of liability.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service | BestForex.io',
    description: 'The terms and conditions governing your use of BestForex.io.',
    url: '/terms',
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
