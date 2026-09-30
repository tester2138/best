import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SITE_URL, SITE_NAME, SITE_OG_IMAGE, SITE_LOGO } from '@/lib/site-config'
import { OrganizationSchema, WebSiteSchema } from '@/components/seo/global-schema'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

const geistMono = Geist_Mono({ 
  subsets: ['latin'],
  variable: '--font-geist-mono'
})

const isProductionDeployment = process.env.VERCEL_ENV === 'production'

export const metadata: Metadata = {
  title: {
    default: 'BestForex.io - Compare the Best Forex Brokers in 2026',
    template: '%s | BestForex.io'
  },
  description: 'Compare top forex brokers with honest reviews, ratings, and detailed analysis. Find the perfect broker for your trading needs with our expert recommendations.',
  authors: [{ name: 'BestForex.io Team' }],
  creator: 'BestForex.io',
  publisher: 'BestForex.io',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'BestForex.io - Compare the Best Forex Brokers in 2026',
    description: 'Compare top forex brokers with honest reviews, ratings, and detailed analysis.',
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: 'BestForex.io' }],
  },
  // Row 73: twitter mirrors openGraph — same title, description, image.
  // Per-page generateMetadata overrides this for article, broker, and listing pages.
  twitter: {
    card: 'summary_large_image',
    title: 'BestForex.io — Compare the Best Forex Brokers in 2026',
    description: 'Compare 1,800+ forex brokers side by side. Independent ratings, regulation checks, spreads and exclusive offers.',
    images: [SITE_OG_IMAGE],
    site: '@bestforexio',
  },
  robots: {
    index: isProductionDeployment,
    follow: isProductionDeployment,
    googleBot: {
      index: isProductionDeployment,
      follow: isProductionDeployment,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  // icons are auto-injected by app/icon.tsx (32x32 PNG) and app/apple-icon.tsx.
  // Explicit entries here would duplicate those <link> tags and confuse crawlers.
  icons: {
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // /business is a standalone authenticated panel — suppress the public
  // site header and footer so it renders as a dedicated app experience.
  const hdrs = await headers()
  const pathname = hdrs.get('x-pathname') ?? hdrs.get('next-url') ?? ''
  const isBusiness = pathname.startsWith('/business') || pathname.startsWith('/admin')

  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <head>
        {/* Row 181: inline the minimal above-fold paint tokens so the header
            and hero render without waiting for the full stylesheet bundle.
            Values mirror the :root tokens in globals.css. */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root{--background:oklch(0.985 0 0);--foreground:oklch(0.145 0 0);--primary:oklch(0.520 0.17 162.48);--primary-foreground:oklch(1 0 0);--border:oklch(0.92 0 0)}
          body{background-color:var(--background);color:var(--foreground)}
          *,::before,::after{box-sizing:border-box;border-color:var(--border)}
        `}} />
        {/* Speed up first broker-logo fetch from the external CDN (SEO #46).
            Guard B: broker-logo.tsx renders the logo <img> with crossOrigin="anonymous",
            making it a CORS request. The preconnect must also carry crossOrigin="anonymous"
            to share the same connection pool — omitting it opens a redundant second slot. */}
        <link rel="preconnect" href="https://img.logo.dev" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.logo.dev" />
        {/* RSS autodiscovery for feed readers and generic feed consumers. Google
            News now generates publication pages automatically rather than using
            publisher-supplied RSS sections in Publisher Center. */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${SITE_NAME} — Forex & Trading News`}
          href={`${SITE_URL}/news/feed.xml`}
        />
        {/* Canonical site-representative image hint for Google Search snippet.
            Points to the static logo PNG (guaranteed fetchable, no dynamic route).
            This tells Googlebot which image represents the site itself, preventing
            it from picking up a broker logo rendered on the page as the thumbnail.
            SITE_LOGO = https://www.bestforex.io/bestforex-logo.png (1092×316px) */}
        <link rel="image_src" href={SITE_LOGO} />
        {/* Explicit site logo hint for Google Knowledge Panel — redundant meta signal. */}
        <meta name="thumbnail" content={SITE_LOGO} />
      </head>
      <body className="font-sans antialiased bg-background">
        {!isBusiness && <OrganizationSchema />}
        {!isBusiness && <WebSiteSchema />}
        {!isBusiness && <Header />}
        <main className={isBusiness ? undefined : 'min-h-screen'}>
          {children}
        </main>
        {!isBusiness && <Footer />}
        {isProductionDeployment && <Analytics />}
      </body>
    </html>
  )
}
