// ============================================================
// AUTO-NEWS SYSTEM TYPES
// ============================================================

export type NewsSource = {
  name: string
  url: string
  // crypto and economy deliberately excluded — only forex/broker content allowed
  category: 'forex' | 'broker' | 'regulation' | 'technology'
}

// ─────────────────────────────────────────────────────────────
// TOPIC RELEVANCE: what IS and IS NOT in scope
// ─────────────────────────────────────────────────────────────

/**
 * Keywords that MUST appear in a topic for it to be considered Forex-brand relevant.
 * At least one of these must match.
 */
export const FOREX_BRAND_REQUIRED_KEYWORDS = [
  'forex broker', 'fx broker', 'cfd broker', 'trading platform',
  'forex platform', 'fx platform', 'metatrader', 'mt4', 'mt5',
  'ctrader', 'trading terminal', 'broker regulation', 'broker license',
  'broker acquisition', 'broker merger', 'broker partnership',
  'broker expansion', 'broker launch', 'broker funding', 'broker capital',
  'forex industry', 'fx industry', 'retail trading', 'retail forex',
  'broker compliance', 'broker fine', 'broker sanction', 'broker ban',
  'leverage', 'spread', 'swap-free', 'ecn broker', 'market maker',
  'liquidity provider', 'prime broker', 'introducing broker',
  'white label broker', 'prop firm', 'proprietary trading firm',
  'copy trading', 'social trading', 'mam account', 'pamm account',
  'esma', 'cysec', 'fca forex', 'asic forex', 'cftc forex',
  'nfa forex', 'fsc forex', 'vfsc forex', 'fsca forex',
  'offshore broker', 'unregulated broker', 'regulated broker',
  ...([
    'bluesuisse', 'saxo bank', 'interactive brokers', 'pepperstone',
    'ic markets', 'xm group', 'etoro', 'plus500', 'oanda', 'fxcm',
    'cmc markets', 'ig group', 'swissquote', 'admiral markets',
    'avatrade', 'exness', 'fxpro', 'hotforex', 'hfm', 'roboforex',
    'tickmill', 'fp markets', 'blackbull', 'fusion markets', 'vantage',
    'eightcap', 'global prime', 'axi', 'tmgm', 'fpmarkets'
  ])
]

/**
 * Keywords that immediately disqualify a topic from publication.
 * If any of these appear as the main subject — reject it.
 */
export const OFF_TOPIC_DISQUALIFIERS = [
  // Stocks & Equities
  'stock market', 'stock exchange', 'nasdaq', 'nyse', 's&p 500', 'dow jones',
  'equity market', 'share price', 'ipo', 'earnings report', 'dividend',
  // Cryptocurrency (unless it is a broker adding crypto CFDs)
  'bitcoin price', 'ethereum price', 'crypto market', 'defi', 'nft',
  'blockchain network', 'altcoin', 'binance hack', 'crypto exchange hack',
  // Commodities / Real Estate
  'oil price', 'gold price rally', 'real estate market', 'housing market',
  'property prices', 'crude oil', 'natural gas price',
  // Macro-only (no broker angle)
  'gdp growth', 'inflation rate', 'unemployment rate', 'consumer price index',
  'central bank rate decision', 'federal reserve meeting', 'ecb meeting',
  // Other finance
  'hedge fund returns', 'private equity deal', 'venture capital fund',
  'mutual fund', 'etf performance', 'bond yield', 'treasury yield',
]

export type RawNewsItem = {
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
}

export type GeneratedArticle = {
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  metaTitle: string
  metaDescription: string
  imageAltText: string
  imagePrompt: string
  tags: string[]
  relatedBrokers: string[]
  wordCount: number
  contentHash: string
  sourceUrl: string
  sourceName: string
}

export type NewsGenerationConfig = {
  minWordCount: number
  maxWordCount: number
  targetAudience: string
  writingStyle: string
  seoFocus: boolean
}

export const DEFAULT_NEWS_CONFIG: NewsGenerationConfig = {
  minWordCount: 500,
  maxWordCount: 800,
  targetAudience: 'B2B forex professionals, traders, and broker comparison seekers',
  writingStyle: 'Professional, informative, and engaging financial journalism',
  seoFocus: true
}

// Known forex brokers for internal linking
// This list must stay in sync with data/brokers.ts
// Each broker has a name, slug (URL path), and aliases for detection
export const KNOWN_BROKERS: Array<{ name: string; slug: string; aliases: string[] }> = [
  // Top-tier / Featured brokers
  { name: 'BlueSuisse', slug: 'bluesuisse', aliases: ['blue suisse', 'bluesuisse', 'blue-suisse'] },
  { name: 'Saxo Bank', slug: 'saxo-bank', aliases: ['saxo', 'saxobank', 'saxo bank a/s'] },
  { name: 'IG', slug: 'ig', aliases: ['ig group', 'ig markets', 'ig.com', 'ig broker'] },
  { name: 'Pepperstone', slug: 'pepperstone', aliases: ['pepper stone', 'pepperstone group'] },
  { name: 'XM', slug: 'xm', aliases: ['xm group', 'xm.com', 'xm broker', 'trading point'] },
  // Major international brokers
  { name: 'Interactive Brokers', slug: 'interactive-brokers', aliases: ['ibkr', 'ib', 'interactive'] },
  { name: 'IC Markets', slug: 'ic-markets', aliases: ['icmarkets', 'ic market'] },
  { name: 'eToro', slug: 'etoro', aliases: ['e-toro', 'etoro.com'] },
  { name: 'Plus500', slug: 'plus500', aliases: ['plus 500', 'plus500.com'] },
  { name: 'OANDA', slug: 'oanda', aliases: ['oanda corp', 'oanda.com'] },
  { name: 'FXCM', slug: 'fxcm', aliases: ['forex capital markets', 'fxcm.com'] },
  { name: 'CMC Markets', slug: 'cmc-markets', aliases: ['cmc', 'cmc market'] },
  { name: 'Swissquote', slug: 'swissquote', aliases: ['swiss quote', 'swissquote bank'] },
  { name: 'Admiral Markets', slug: 'admiral-markets', aliases: ['admirals', 'admiral'] },
  { name: 'AvaTrade', slug: 'avatrade', aliases: ['ava trade', 'ava', 'avatrade.com'] },
  { name: 'Exness', slug: 'exness', aliases: ['exness.com', 'exness group'] },
  { name: 'FxPro', slug: 'fxpro', aliases: ['fx pro', 'fxpro.com'] },
  { name: 'HotForex', slug: 'hotforex', aliases: ['hot forex', 'hfm', 'hf markets'] },
  { name: 'RoboForex', slug: 'roboforex', aliases: ['robo forex', 'roboforex.com'] },
  { name: 'Tickmill', slug: 'tickmill', aliases: ['tickmill.com', 'tickmill group'] },
  // Additional brokers from data/brokers.ts
  { name: 'XTB', slug: 'xtb', aliases: ['x-trade brokers', 'xtb.com'] },
  { name: 'FOREX.com', slug: 'forex-com', aliases: ['forex.com', 'gain capital'] },
  { name: 'ThinkMarkets', slug: 'thinkmarkets', aliases: ['think markets', 'thinktrader'] },
  { name: 'FP Markets', slug: 'fp-markets', aliases: ['fpmarkets', 'fp market'] },
  { name: 'Vantage', slug: 'vantage', aliases: ['vantage fx', 'vantagefx', 'vantage markets'] },
  { name: 'Eightcap', slug: 'eightcap', aliases: ['eight cap', '8cap'] },
  { name: 'BlackBull Markets', slug: 'blackbull-markets', aliases: ['blackbull', 'black bull'] },
  { name: 'Fusion Markets', slug: 'fusion-markets', aliases: ['fusion', 'fusionmarkets'] },
  { name: 'Global Prime', slug: 'global-prime', aliases: ['globalprime'] },
  { name: 'Axi', slug: 'axi', aliases: ['axitrader', 'axi.com'] },
  { name: 'TMGM', slug: 'tmgm', aliases: ['trademax', 'tmgm.com'] },
  { name: 'Capital.com', slug: 'capital-com', aliases: ['capital', 'capital.com'] },
  { name: 'Deriv', slug: 'deriv', aliases: ['deriv.com', 'binary.com'] },
  { name: 'FBS', slug: 'fbs', aliases: ['fbs.com', 'fbs broker'] },
  { name: 'OctaFX', slug: 'octafx', aliases: ['octa fx', 'octa'] },
  { name: 'InstaForex', slug: 'instaforex', aliases: ['insta forex', 'instaforex.com'] },
  { name: 'LiteFinance', slug: 'litefinance', aliases: ['lite finance', 'liteforex'] },
  { name: 'IronFX', slug: 'ironfx', aliases: ['iron fx', 'ironfx.com'] },
  { name: 'Markets.com', slug: 'markets-com', aliases: ['markets.com'] },
  { name: 'Trading 212', slug: 'trading-212', aliases: ['trading212', 't212'] },
  { name: 'Libertex', slug: 'libertex', aliases: ['libertex.com'] },
  { name: 'NordFX', slug: 'nordfx', aliases: ['nord fx'] },
  { name: 'JustMarkets', slug: 'justmarkets', aliases: ['just markets', 'justforex'] },
  { name: 'MultiBank', slug: 'multibank', aliases: ['multibank group', 'mex exchange'] },
  { name: 'Dukascopy', slug: 'dukascopy', aliases: ['dukascopy bank'] },
]

// Forex news categories
export const NEWS_CATEGORIES = [
  'Broker News',
  'Regulatory Updates',
  'Market Analysis',
  'Technology',
  'Mergers & Acquisitions',
  'Platform Updates',
  'Industry Trends',
  'Partnerships'
] as const

export type NewsCategory = typeof NEWS_CATEGORIES[number]
