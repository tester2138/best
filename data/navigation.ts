import type { NavItem } from '@/lib/types'

export const mainNavigation: NavItem[] = [
  {
    label: 'Brokers',
    href: '/brokers'
  },
  {
    label: 'Offers',
    href: '/offers'
  },
  {
    label: 'News',
    href: '/news'
  },
  {
    label: 'Media Kit',
    href: '/media-kit'
  }
]

export const footerNavigation = {
  brokers: [
    { label: 'Best Forex Brokers', href: '/brokers' },
    { label: 'Compare Brokers', href: '/compare' },
    { label: 'Broker Offers', href: '/offers' }
  ],
  // T23 + Row 28: each href exactly once. Broker Offers (/offers) and Compare
  // Brokers (/compare) already appear in the Brokers column, so they are
  // removed from Resources to avoid duplicate footer anchors.
  resources: [
    { label: 'Forex News', href: '/news' },
    { label: 'Learn Forex', href: '/learn' },
    { label: 'Glossary', href: '/learn/glossary' },
  ],
  advertise: [
    { label: 'Grow Your Business', href: '/contact-us?intent=partnership' },
    { label: 'Media Kit', href: '/media-kit' },
    { label: 'Buy Ad Space', href: '/contact-us?intent=advertising' },
    { label: 'Featured Broker Listing', href: '/contact-us?intent=featured-listing' },
    { label: 'Claim Your Brand', href: '/contact-us?intent=claim' }
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Why Trust Us', href: '/why-trust-us' },
    { label: 'Editorial Team', href: '/news/author' },
    { label: 'Editorial Policy', href: '/editorial-policy' },
    { label: 'Corrections', href: '/corrections' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'Contact Us', href: '/contact-us' }
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms & Conditions', href: '/terms' },
    { label: 'Risk Disclaimer', href: '/disclaimer' }
  ]
}

export const brokerLogoStrip = [
  { name: 'Saxo Bank', slug: 'saxo-bank', logo: '/logos/brokers/saxo-bank.svg', href: '/brokers/saxo-bank' },
  { name: 'Capital.com', slug: 'capital-com', logo: '/logos/brokers/capital-com.svg', href: '/brokers/capital-com' },
  { name: 'IG', slug: 'ig', logo: '/logos/brokers/ig.svg', href: '/brokers/ig' },
  { name: 'XM', slug: 'xm', logo: '/logos/brokers/xm.svg', href: '/brokers/xm' },
  { name: 'FXCM', slug: 'fxcm', logo: '/logos/brokers/fxcm.svg', href: '/brokers/fxcm' },
  { name: 'eToro', slug: 'etoro', logo: '/logos/brokers/etoro.svg', href: '/brokers/etoro' },
  { name: 'AvaTrade', slug: 'avatrade', logo: '/logos/brokers/avatrade.svg', href: '/brokers/avatrade' },
  { name: 'CMC Markets', slug: 'cmc-markets', logo: '/logos/brokers/cmc-markets.svg', href: '/brokers/cmc-markets' },
  { name: 'Plus500', slug: 'plus500', logo: '/logos/brokers/plus500.svg', href: '/brokers/plus500' },
  { name: 'Pepperstone', slug: 'pepperstone', logo: '/logos/brokers/pepperstone.svg', href: '/brokers/pepperstone' }
]
