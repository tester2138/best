import Link from 'next/link'
import { TrendingUp, Mail, AlertTriangle, Twitter, Linkedin } from 'lucide-react'
import { footerNavigation } from '@/data/navigation'
// Row 117: social links wired to SITE_SOCIALS constants so the same URLs feed
// both the footer and the Organization schema `sameAs` array.
import { SITE_SOCIALS, SITE_SOCIALS_VERIFIED } from '@/lib/site-config'

/** Map a social URL to a display label and icon. */
function socialMeta(url: string): { label: string; Icon: React.ElementType } | null {
  if (url.includes('twitter.com') || url.includes('x.com')) return { label: 'Twitter / X', Icon: Twitter }
  if (url.includes('linkedin.com')) return { label: 'LinkedIn', Icon: Linkedin }
  return null
}

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-foreground text-background">
      {/* Risk Warning Banner - High Contrast */}
      <div className="bg-amber-50 border-y border-amber-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              <strong className="font-semibold">Risk Warning:</strong> CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage.
              Between 74-89% of retail investor accounts lose money when trading CFDs.
              You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.
              Forex and CFD trading may not be suitable for all investors. Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-10">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-background">
                BestForex<span className="text-primary">.io</span>
              </span>
            </Link>
            <p className="text-sm text-background/70 mb-6 max-w-xs">
              Independent forex broker reviews and comparisons. Helping traders find the right broker since 2024.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:info@bestforex.io"
                className="inline-flex items-center gap-2 text-sm text-background/70 hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                info@bestforex.io
              </a>
              <a
                href="mailto:editorial@bestforex.io"
                className="inline-flex items-center gap-2 text-sm text-background/70 hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                editorial@bestforex.io
              </a>
            </div>
          </div>

          {/* Navigation Columns */}
          <div>
            <h3 className="font-semibold text-background mb-4">Brokers</h3>
            <ul className="space-y-3">
              {footerNavigation.brokers.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-background mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerNavigation.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-background mb-4">Advertise</h3>
            <ul className="space-y-3">
              {footerNavigation.advertise.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-background mb-4">Company</h3>
            <ul className="space-y-3">
              {footerNavigation.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-background mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerNavigation.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Row 117 / Guard A: social links driven by SITE_SOCIALS constants.
            Hidden until SITE_SOCIALS_VERIFIED=true in lib/site.ts so placeholder
            URLs are never rendered publicly. ASK T49: Kerem to verify and flip the flag. */}
        {SITE_SOCIALS_VERIFIED && SITE_SOCIALS.length > 0 && (
          <div className="mt-10 pt-8 border-t border-background/10 flex items-center gap-4">
            <span className="text-xs text-background/50 font-medium uppercase tracking-wide">Follow us</span>
            {SITE_SOCIALS.map((url) => {
              const meta = socialMeta(url)
              if (!meta) return null
              const { label, Icon } = meta
              return (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex items-center gap-1.5 text-sm text-background/60 hover:text-primary transition-colors"
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </a>
              )
            })}
          </div>
        )}

        {/* T57: Newsletter subscription strip */}
        <div className="mt-12 pt-10 border-t border-background/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-10 border-b border-background/10">
            <div>
              <p className="font-semibold text-background text-sm">Weekly Forex Briefing</p>
              <p className="text-xs text-background/60 mt-0.5">
                Broker news, regulatory updates, and market analysis — every Monday.
              </p>
            </div>
            <form
              action="/api/newsletter"
              method="POST"
              className="flex w-full sm:w-auto gap-2"
              aria-label="Newsletter signup"
            >
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-newsletter-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="flex-1 sm:w-56 rounded-md border border-background/20 bg-background/10 px-3 py-2 text-sm text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-background/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-background/60">
              &copy; {currentYear} BestForex.io. All rights reserved.
            </p>
            <p className="text-xs text-background/50 text-center md:text-right max-w-lg">
              Affiliate Disclosure: Some links on this site are affiliate links. 
              We may receive compensation when you sign up through our links. 
              This does not influence our rankings or reviews.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
