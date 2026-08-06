import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read the BestForex.io privacy policy: what data we collect, how we use it, cookies, third parties and your rights.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy | BestForex.io',
    description: 'How BestForex.io collects, uses and protects your data.',
    url: '/privacy',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
