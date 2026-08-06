import type { RawNewsItem } from './news-types'
import { FOREX_BRAND_REQUIRED_KEYWORDS, OFF_TOPIC_DISQUALIFIERS } from './news-types'

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SOURCE NEWS FETCHING SYSTEM
// Sources are tried in order; results are merged and deduplicated
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trusted Forex industry RSS feeds — primary news sources
 */
const RSS_FEEDS = [
  {
    name: 'Finance Magnates',
    url: 'https://www.financemagnates.com/feed/',
    category: 'broker' as const,
  },
  {
    name: 'FX Empire',
    url: 'https://www.fxempire.com/news/feed',
    category: 'forex' as const,
  },
  {
    name: 'LeapRate',
    url: 'https://www.leaprate.com/feed/',
    category: 'broker' as const,
  },
  {
    name: 'Forex Live',
    url: 'https://www.forexlive.com/feed/',
    category: 'forex' as const,
  },
  {
    name: 'DailyFX',
    url: 'https://www.dailyfx.com/feeds/market-news',
    category: 'forex' as const,
  },
  {
    name: 'FXStreet',
    url: 'https://www.fxstreet.com/rss/news',
    category: 'forex' as const,
  },
]

/**
 * Search queries for Google News RSS (free, no API key required)
 */
const GOOGLE_NEWS_QUERIES = [
  'forex broker regulation',
  'forex broker acquisition',
  'MetaTrader broker',
  'CFD broker news',
  'forex trading platform',
  'forex broker license',
  'prop trading firm',
  'retail forex broker',
]

/**
 * Backup search queries for Bing News RSS (free, no API key)
 */
const BING_NEWS_QUERIES = [
  'forex+broker+news',
  'CFD+broker+regulation',
  'forex+platform+update',
  'forex+industry+news',
]

// ─────────────────────────────────────────────────────────────────────────────
// RSS PARSER — lightweight XML parsing without external dependencies
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse RSS/Atom XML into news items
 */
function parseRssFeed(xml: string, sourceName: string): RawNewsItem[] {
  const items: RawNewsItem[] = []

  // Extract items from RSS 2.0 format
  const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || []
  
  // Also check for Atom entry format
  const entryMatches = xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || []
  
  const allMatches = [...itemMatches, ...entryMatches]

  for (const itemXml of allMatches.slice(0, 10)) {
    try {
      // Extract title
      const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : ''

      // Extract description/summary
      const descMatch = itemXml.match(/<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i)
      let description = descMatch ? decodeHtmlEntities(descMatch[1].trim()) : ''
      // Strip HTML from description
      description = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)

      // Extract link
      const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) ||
                        itemXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
      const url = linkMatch ? (linkMatch[1] || '').trim() : ''

      // Extract publish date
      const dateMatch = itemXml.match(/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i)
      const publishedAt = dateMatch ? new Date(dateMatch[1].trim()).toISOString() : new Date().toISOString()

      if (title && title.length > 10) {
        items.push({
          title: title.slice(0, 200),
          description: description || title,
          url,
          source: sourceName,
          publishedAt,
        })
      }
    } catch (e) {
      // Skip malformed items
      continue
    }
  }

  return items
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
}

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch from direct RSS feeds (Finance Magnates, LeapRate, etc.)
 */
async function fetchFromRssFeeds(): Promise<RawNewsItem[]> {
  const allItems: RawNewsItem[] = []
  
  // Randomly select 3 feeds to avoid hitting all at once
  const selectedFeeds = RSS_FEEDS
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)

  for (const feed of selectedFeeds) {
    try {
      console.log(`[AutoNews] Fetching RSS: ${feed.name}`)
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'BestForex News Aggregator/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (response.ok) {
        const xml = await response.text()
        const items = parseRssFeed(xml, feed.name)
        console.log(`[AutoNews] Got ${items.length} items from ${feed.name}`)
        allItems.push(...items)
      }
    } catch (error) {
      console.warn(`[AutoNews] RSS fetch failed for ${feed.name}:`, error)
    }
  }

  return allItems
}

/**
 * Fetch from Google News RSS (free, no API key)
 */
async function fetchFromGoogleNews(): Promise<RawNewsItem[]> {
  const allItems: RawNewsItem[] = []
  
  // Pick 2 random queries
  const queries = GOOGLE_NEWS_QUERIES
    .sort(() => 0.5 - Math.random())
    .slice(0, 2)

  for (const query of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
      console.log(`[AutoNews] Fetching Google News: "${query}"`)
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'BestForex News Aggregator/1.0' },
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const xml = await response.text()
        const items = parseRssFeed(xml, 'Google News')
        console.log(`[AutoNews] Got ${items.length} items from Google News for "${query}"`)
        allItems.push(...items)
      }
    } catch (error) {
      console.warn(`[AutoNews] Google News fetch failed:`, error)
    }
  }

  return allItems
}

/**
 * Fetch from Bing News RSS (free backup source)
 */
async function fetchFromBingNews(): Promise<RawNewsItem[]> {
  const allItems: RawNewsItem[] = []
  
  const query = BING_NEWS_QUERIES[Math.floor(Math.random() * BING_NEWS_QUERIES.length)]

  try {
    const url = `https://www.bing.com/news/search?q=${query}&format=rss`
    console.log(`[AutoNews] Fetching Bing News: "${query}"`)
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BestForex News Aggregator/1.0' },
      signal: AbortSignal.timeout(10000),
    })

    if (response.ok) {
      const xml = await response.text()
      const items = parseRssFeed(xml, 'Bing News')
      console.log(`[AutoNews] Got ${items.length} items from Bing News`)
      allItems.push(...items)
    }
  } catch (error) {
    console.warn(`[AutoNews] Bing News fetch failed:`, error)
  }

  return allItems
}

/**
 * Fetch from DuckDuckGo Instant Answer API (original method, now a fallback)
 */
async function fetchFromDuckDuckGo(): Promise<RawNewsItem[]> {
  const allItems: RawNewsItem[] = []
  const queries = [
    'forex broker news',
    'CFD broker regulation',
    'forex trading platform',
  ]

  const query = queries[Math.floor(Math.random() * queries.length)]

  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      {
        headers: { 'User-Agent': 'BestForex News Bot/1.0' },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.Text && topic.FirstURL) {
            allItems.push({
              title: topic.Text.slice(0, 120),
              description: topic.Text,
              url: topic.FirstURL,
              source: 'DuckDuckGo',
              publishedAt: new Date().toISOString(),
            })
          }
        }
      }
    }
  } catch (error) {
    console.warn(`[AutoNews] DuckDuckGo fetch failed:`, error)
  }

  return allItems
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove duplicate news items based on title similarity
 */
function deduplicateNews(items: RawNewsItem[]): RawNewsItem[] {
  const seen = new Set<string>()
  const unique: RawNewsItem[] = []

  for (const item of items) {
    // Normalize title for comparison
    const normalizedTitle = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 50)

    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle)
      unique.push(item)
    }
  }

  return unique
}

// ─────────────────────────────────────────────────────────────────────────────
// TOPIC RELEVANCE FILTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the topic is on-topic for a B2B Forex brand news site.
 * Checks required keywords AND disqualifier exclusion.
 */
export function isForexBrandRelevant(title: string, description: string): {
  relevant: boolean
  reason?: string
} {
  const combined = `${title} ${description}`.toLowerCase()

  // 1. Hard disqualifier check — if any off-topic keyword is the main focus, reject
  for (const disqualifier of OFF_TOPIC_DISQUALIFIERS) {
    if (combined.includes(disqualifier.toLowerCase())) {
      return { relevant: false, reason: `Off-topic keyword: "${disqualifier}"` }
    }
  }

  // 2. Required keyword check — must contain at least one forex-brand signal
  for (const keyword of FOREX_BRAND_REQUIRED_KEYWORDS) {
    if (combined.includes(keyword.toLowerCase())) {
      return { relevant: true }
    }
  }

  return {
    relevant: false,
    reason: 'No Forex brand keyword found in topic',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FETCHER — Multi-source with fallback chain
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches latest forex news from multiple sources and filters for relevance.
 * Sources are tried in order of reliability; results are merged and deduplicated.
 */
export async function fetchLatestForexNews(): Promise<RawNewsItem[]> {
  console.log('[AutoNews] Starting multi-source news fetch')
  
  const allNews: RawNewsItem[] = []
  const sourceStats: Record<string, number> = {}

  // Source 1: Direct RSS feeds from trusted forex news sites (most reliable)
  try {
    const rssItems = await fetchFromRssFeeds()
    allNews.push(...rssItems)
    sourceStats['RSS Feeds'] = rssItems.length
  } catch (error) {
    console.error('[AutoNews] RSS feeds source failed:', error)
  }

  // Source 2: Google News RSS (good for fresh news)
  try {
    const googleItems = await fetchFromGoogleNews()
    allNews.push(...googleItems)
    sourceStats['Google News'] = googleItems.length
  } catch (error) {
    console.error('[AutoNews] Google News source failed:', error)
  }

  // Source 3: Bing News RSS (backup)
  if (allNews.length < 5) {
    try {
      const bingItems = await fetchFromBingNews()
      allNews.push(...bingItems)
      sourceStats['Bing News'] = bingItems.length
    } catch (error) {
      console.error('[AutoNews] Bing News source failed:', error)
    }
  }

  // Source 4: DuckDuckGo (last resort for instant answers)
  if (allNews.length < 3) {
    try {
      const ddgItems = await fetchFromDuckDuckGo()
      allNews.push(...ddgItems)
      sourceStats['DuckDuckGo'] = ddgItems.length
    } catch (error) {
      console.error('[AutoNews] DuckDuckGo source failed:', error)
    }
  }

  // Log source statistics
  console.log(`[AutoNews] Source stats:`, sourceStats)
  console.log(`[AutoNews] Total raw items fetched: ${allNews.length}`)

  // Deduplicate across sources
  const deduped = deduplicateNews(allNews)
  console.log(`[AutoNews] After deduplication: ${deduped.length} unique items`)

  // Filter for Forex brand relevance
  const relevant: RawNewsItem[] = []
  for (const item of deduped) {
    const relevance = isForexBrandRelevant(item.title, item.description)
    if (relevance.relevant) {
      relevant.push(item)
    } else {
      console.log(`[AutoNews] Filtered out: "${item.title.slice(0, 60)}..." — ${relevance.reason}`)
    }
  }

  console.log(`[AutoNews] After relevance filter: ${relevant.length} on-topic items`)

  // Fallback to curated topics if no external results passed filters
  if (relevant.length === 0) {
    console.log('[AutoNews] No external results passed filters — using curated brand topics')
    return getCuratedBrandTopics()
  }

  // Sort by publish date (newest first)
  relevant.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )

  return relevant
}

// ─────────────────────────────────────────────────────────────────────────────
// CURATED FALLBACK TOPICS — 100% Forex brand focused, never generic market news
// ─────────────────────────────────────────────────────────────────────────────

/**
 * High-quality, strictly B2B Forex brand fallback topics.
 * Every entry references a specific broker action, regulation, platform, or industry event.
 */
function getCuratedBrandTopics(): RawNewsItem[] {
  const topics: Array<{ title: string; description: string; source: string; category: string }> = [
    // Regulation
    {
      title: 'FCA Tightens Leverage Rules for UK-Based Forex Brokers in New Consultation Paper',
      description: 'The UK Financial Conduct Authority has released a consultation paper proposing stricter leverage caps and enhanced client money protections for retail forex and CFD brokers operating under FCA authorisation.',
      source: 'Regulatory Update',
      category: 'Regulatory Updates',
    },
    {
      title: 'CySEC Issues Warning Against Five Unlicensed Forex Brokers Targeting EU Traders',
      description: 'The Cyprus Securities and Exchange Commission published a public alert identifying five unregulated entities falsely claiming CySEC authorisation and offering forex and CFD products to retail clients.',
      source: 'Regulatory News',
      category: 'Regulatory Updates',
    },
    {
      title: 'ASIC Permanently Bans Forex Broker Director Following Client Fund Misuse',
      description: 'Australia\'s Securities and Investments Commission has imposed a permanent ban on a former forex broker director found guilty of misappropriating retail client funds and providing unlicensed financial advice.',
      source: 'Regulatory News',
      category: 'Regulatory Updates',
    },
    {
      title: 'ESMA Extends Temporary Restrictions on CFD Products for Retail Clients',
      description: 'The European Securities and Markets Authority has renewed its product intervention measures restricting leverage on forex and CFD products offered to retail investors across EU member states.',
      source: 'Regulatory News',
      category: 'Regulatory Updates',
    },
    // Broker Business
    {
      title: 'Pepperstone Secures Tier-1 Banking Partnership to Strengthen Liquidity Infrastructure',
      description: 'Pepperstone has announced a new prime brokerage agreement with a major tier-1 bank, aimed at enhancing execution quality, reducing spreads, and improving liquidity depth for institutional and retail forex clients.',
      source: 'Broker News',
      category: 'Broker News',
    },
    {
      title: 'IC Markets Launches Islamic Swap-Free Accounts Across All Major Currency Pairs',
      description: 'IC Markets has expanded its swap-free account offering to cover all major, minor, and exotic currency pairs, responding to growing demand from traders in GCC and Southeast Asian markets.',
      source: 'Broker News',
      category: 'Broker News',
    },
    {
      title: 'Exness Surpasses $4 Trillion in Monthly Trading Volume, Sets New Industry Record',
      description: 'Exness has reported a record-breaking monthly trading volume exceeding $4 trillion, reinforcing its position as one of the largest retail forex brokers by volume, with significant growth from Asian and African markets.',
      source: 'Industry Data',
      category: 'Industry Trends',
    },
    {
      title: 'FxPro Expands Broker Offering With Multi-Asset Platform Featuring 2,100 Instruments',
      description: 'FxPro has rolled out a major platform update, adding equity CFDs, commodities, and ETF products to its existing forex and index offering, bringing total tradeable instruments to over 2,100 across MT4, MT5, and cTrader.',
      source: 'Broker News',
      category: 'Platform Updates',
    },
    // Technology
    {
      title: 'MetaQuotes Releases MetaTrader 5 Build 4000 With Enhanced Algorithmic Trading Tools',
      description: 'MetaQuotes has shipped a major MetaTrader 5 update introducing improved MQL5 compiler performance, new backtesting capabilities, enhanced strategy tester visualisation, and deeper integration with cloud-based virtual private servers.',
      source: 'Technology News',
      category: 'Technology',
    },
    {
      title: 'cTrader Introduces Open API for Third-Party Plugin Developers in Latest Platform Release',
      description: 'Spotware Systems has launched an open API framework for cTrader, enabling third-party developers to build native plugins and trading tools directly integrated into the platform, aiming to accelerate ecosystem growth.',
      source: 'Technology News',
      category: 'Technology',
    },
    {
      title: 'Prop Trading Firm FTMO Introduces New Evaluation Model With Weekly Payouts',
      description: 'FTMO has overhauled its trader evaluation programme, introducing a two-phase challenge with weekly profit withdrawals and updated drawdown rules designed to attract consistently profitable retail forex traders.',
      source: 'Industry News',
      category: 'Industry Trends',
    },
    {
      title: 'AvaTrade Partners With TradingView to Offer Charting Directly From Platform',
      description: 'AvaTrade has integrated TradingView\'s advanced charting suite directly into its web trading platform, giving retail forex and CFD clients access to institutional-grade technical analysis tools without switching applications.',
      source: 'Broker News',
      category: 'Partnerships',
    },
    // M&A
    {
      title: 'Admiral Markets Rebrands to Admirals as Part of Global Expansion Into New Verticals',
      description: 'Admiral Markets Group has officially completed its rebrand to Admirals, consolidating its retail forex, CFD, and investing products under a unified brand identity as the company targets expansion into banking and wealth management services.',
      source: 'Business News',
      category: 'Mergers & Acquisitions',
    },
    {
      title: 'HFM (HotForex) Obtains New FSA Seychelles License for Offshore Client Servicing',
      description: 'HF Markets Group has been granted a Securities Dealer licence by the Financial Services Authority of Seychelles, allowing the broker to service international retail forex clients under a regulated offshore entity.',
      source: 'Regulatory News',
      category: 'Regulatory Updates',
    },
    {
      title: 'Tickmill Introduces Dedicated Institutional Forex Desk for Prime-of-Prime Clients',
      description: 'Tickmill has launched an institutional trading division targeting hedge funds, family offices, and professional traders requiring prime-of-prime access, competitive raw spreads, and dedicated account management.',
      source: 'Broker News',
      category: 'Broker News',
    },
    {
      title: 'RoboForex Adds Cent Accounts and Micro Lots to Attract Beginner Forex Traders',
      description: 'RoboForex has introduced cent-denominated trading accounts with micro-lot execution, reducing the minimum deposit threshold and enabling new forex traders to practise live trading with reduced capital exposure.',
      source: 'Broker News',
      category: 'Broker News',
    },
  ]

  // Shuffle and select 4-6 topics to ensure diversity each run
  const shuffled = topics.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 5).map(t => ({
    title: t.title,
    description: t.description,
    url: '',
    source: t.source,
    publishedAt: new Date().toISOString(),
  }))
}

/**
 * Get statistics about available news sources
 */
export function getNewsSources(): Array<{ name: string; type: string; status: 'active' | 'backup' }> {
  return [
    ...RSS_FEEDS.map(f => ({ name: f.name, type: 'RSS Feed', status: 'active' as const })),
    { name: 'Google News', type: 'News Aggregator', status: 'active' as const },
    { name: 'Bing News', type: 'News Aggregator', status: 'backup' as const },
    { name: 'DuckDuckGo', type: 'Instant Answers', status: 'backup' as const },
    { name: 'Curated Topics', type: 'Fallback', status: 'backup' as const },
  ]
}

/**
 * Generate a content hash for duplicate detection.
 * Uses normalized content (stripped HTML, lowercase, no punctuation) for robust matching.
 */
export function generateContentHash(title: string, content: string): string {
  // Normalize: strip HTML, entities, lowercase, remove punctuation & extra whitespace
  const normalizedContent = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[^a-z0-9\s]/gi, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  // Use title + first 500 chars + last 300 chars of normalized content for better uniqueness
  const contentSample = normalizedContent.slice(0, 500) + normalizedContent.slice(-300)
  const str = `${title.toLowerCase().replace(/[^a-z0-9]/g, '')}::${contentSample}`

  // FNV-1a 64-bit-like hash (more collision resistant than simple djb2)
  let h1 = 0x811c9dc5
  let h2 = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    h1 ^= char
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= char
    h2 = Math.imul(h2, 0x01000193) ^ (char << 8)
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`
}
