import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './portal-theme.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600'],
})

// The whole portal is private — keep it out of every index (Blueprint 11.4).
export const metadata: Metadata = {
  title: 'Broker Portal · BestForex.io',
  robots: { index: false, follow: false },
}

/**
 * Portal root layout. Applies the scoped Apple theme + Inter font to the entire
 * /portal subtree. The `(auth)` and `(app)` route groups add their own inner
 * layouts (centered card vs. authenticated shell).
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className={`portal-theme ${inter.variable} min-h-screen`}>{children}</div>
}
