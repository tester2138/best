import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== 'production') {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /_next/ static assets are implicitly allowed (no disallow entry).
        // Only truly private/non-content routes are blocked. Filtered and
        // sorted /brokers URLs are intentionally LEFT CRAWLABLE: each one
        // self-canonicalizes to /brokers, so Google must be able to fetch them
        // to read that canonical and consolidate them (blocking would prevent
        // dedup and would also break the WebSite SearchAction target).
        disallow: ['/api/', '/claim-profile', '/add-broker'],
      },
      // ── AI crawler rules — T09: all four ALLOWED per Kerem 2026-07-06 ───────
      { userAgent: 'GPTBot',          allow: '/' },   // OpenAI GPT training
      { userAgent: 'ClaudeBot',       allow: '/' },   // Anthropic Claude
      { userAgent: 'PerplexityBot',   allow: '/' },   // Perplexity AI
      { userAgent: 'Google-Extended', allow: '/' },   // Google Gemini / AI Overview
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
  }
}
