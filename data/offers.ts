import type { Offer } from '@/lib/types'

export const offers: Offer[] = [
  {
    id: 'offer-xm-1',
    brokerId: 'xm',
    brokerName: 'XM',
    brokerLogo: '/logos/brokers/xm.svg',
    title: '$30 No Deposit Bonus',
    description: 'Start trading with $30 free credit. No deposit required. Available to new clients only.',
    value: '$30',
    type: 'no-deposit',
    terms: 'New clients only. Profits withdrawable after trading requirements met. T&Cs apply.',
    affiliateUrl: 'https://www.xm.com/bonus/?ref=bestforex',
    isFeatured: true,
    isExclusive: false
  },
  {
    id: 'offer-xm-2',
    brokerId: 'xm',
    brokerName: 'XM',
    brokerLogo: '/logos/brokers/xm.svg',
    title: '50% + 20% Deposit Bonus',
    description: 'Get 50% bonus on your first $500 deposit plus 20% on the next $4,500.',
    value: 'Up to $5,000',
    type: 'deposit',
    terms: 'Bonus not withdrawable. Volume requirements apply. T&Cs apply.',
    affiliateUrl: 'https://www.xm.com/bonus/?ref=bestforex',
    isFeatured: true,
    isExclusive: false
  },
  {
    id: 'offer-capital-com-1',
    brokerId: 'capital-com',
    brokerName: 'Capital.com',
    brokerLogo: '/logos/brokers/capital-com.svg',
    title: 'Commission-Free CFD Trading',
    description: 'Trade 3,000+ instruments with zero commission and spreads from 0.2 pips. Start from just $20 with AI-powered trading insights.',
    value: '$20 min deposit',
    type: 'other',
    terms: 'Spreads apply. CFDs are complex instruments and carry risk of losing money rapidly. T&Cs apply.',
    affiliateUrl: 'https://capital.com/?ref=bestforex',
    isFeatured: true,
    isExclusive: true
  },
  {
    id: 'offer-avatrade-1',
    brokerId: 'avatrade',
    brokerName: 'AvaTrade',
    brokerLogo: '/logos/brokers/avatrade.svg',
    title: 'Welcome Bonus',
    description: 'Get up to $10,000 trading bonus on your first deposit with AvaTrade.',
    value: 'Up to $10,000',
    type: 'deposit',
    terms: 'Volume requirements apply. Bonus not available in all regions. T&Cs apply.',
    affiliateUrl: 'https://www.avatrade.com/bonus/?ref=bestforex',
    isFeatured: false,
    isExclusive: false
  },
  {
    id: 'offer-pepperstone-1',
    brokerId: 'pepperstone',
    brokerName: 'Pepperstone',
    brokerLogo: '/logos/brokers/pepperstone.svg',
    title: 'Razor Account - Raw Spreads',
    description: 'Trade with raw spreads from 0.0 pips. No minimum deposit required.',
    value: '0.0 pip spreads',
    type: 'other',
    terms: 'Commission applies. T&Cs apply.',
    affiliateUrl: 'https://www.pepperstone.com/razor/?ref=bestforex',
    isFeatured: true,
    isExclusive: false
  },
  {
    id: 'offer-etoro-1',
    brokerId: 'etoro',
    brokerName: 'eToro',
    brokerLogo: '/logos/brokers/etoro.svg',
    title: '0% Commission Stocks',
    description: 'Invest in real stocks with 0% commission. Copy top traders automatically.',
    value: '0% commission',
    type: 'other',
    terms: 'Other fees may apply. Capital at risk. T&Cs apply.',
    affiliateUrl: 'https://www.etoro.com/stocks/?ref=bestforex',
    isFeatured: true,
    isExclusive: false
  }
]

export function getFeaturedOffers(): Offer[] {
  return offers.filter(o => o.isFeatured)
}

export function getOffersByBroker(brokerId: string): Offer[] {
  return offers.filter(o => o.brokerId === brokerId)
}

export function getExclusiveOffers(): Offer[] {
  return offers.filter(o => o.isExclusive)
}
