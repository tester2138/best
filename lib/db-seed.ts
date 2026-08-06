import { sql } from './db'
import { initializeDatabase } from './db-init'

const SEED_POSTS = [
  {
    slug: 'top-forex-brokers-2026',
    title: 'Top 10 Forex Brokers in 2026: Complete Review and Comparison',
    excerpt: 'Discover the best forex brokers for 2026 with detailed comparisons, pricing, and features.',
    content: `The forex market continues to evolve, and choosing the right broker is crucial for success.

In 2026, we've identified the top 10 forex brokers that offer competitive spreads, excellent customer service, and advanced trading platforms.

Our comprehensive review considers multiple factors including regulation, trading conditions, education resources, and user experience.

Whether you're a beginner or an experienced trader, this guide will help you make an informed decision.`,
    category: 'review',
    author_name: 'John Smith',
    author_slug: 'john-smith',
    is_featured: true,
  },
  {
    slug: 'forex-market-trends-2026',
    title: 'Major Forex Market Trends Shaping 2026',
    excerpt: 'Explore the biggest trends influencing forex markets and how to trade them.',
    content: `2026 marks significant shifts in global currency markets.

Central banks worldwide are adjusting monetary policies, creating new trading opportunities.

The rise of digital currencies continues to impact traditional forex markets.

Understanding these trends will help you stay ahead in your trading strategy.`,
    category: 'analysis',
    author_name: 'Jane Doe',
    author_slug: 'jane-doe',
    is_featured: true,
  },
  {
    slug: 'beginner-guide-forex-trading',
    title: 'The Complete Beginner\'s Guide to Forex Trading',
    excerpt: 'Learn the fundamentals of forex trading, from currency pairs to making your first trade.',
    content: `Forex trading can seem intimidating, but understanding the basics is simpler than you think.

This guide covers everything from what currency pairs are to how to place your first trade.

We'll explain bid-ask spreads, leverage, and risk management for beginners.

Start your forex trading journey with confidence today.`,
    category: 'education',
    author_name: 'Mike Johnson',
    author_slug: 'mike-johnson',
    is_featured: false,
  },
  {
    slug: 'best-forex-trading-platforms-comparison',
    title: 'Best Forex Trading Platforms Compared: Features and Costs',
    excerpt: 'Compare the leading forex trading platforms and find the one that fits your needs.',
    content: `Selecting the right trading platform is essential for your success in forex.

We've compared MetaTrader 4, MetaTrader 5, cTrader, and proprietary platforms.

Each has unique advantages depending on your trading style and experience level.

Find out which platform is right for you.`,
    category: 'guide',
    author_name: 'Sarah Williams',
    author_slug: 'sarah-williams',
    is_featured: false,
  },
  {
    slug: 'forex-regulation-guide-2026',
    title: 'Forex Regulation in 2026: What Traders Need to Know',
    excerpt: 'Stay informed about forex regulations and compliance requirements for 2026.',
    content: `Forex regulation is constantly evolving globally.

New rules and compliance requirements take effect in 2026 that affect traders worldwide.

Understanding these regulations helps protect your investments and ensures broker legitimacy.

This guide covers major regulatory changes and what they mean for you.`,
    category: 'news',
    author_name: 'David Brown',
    author_slug: 'david-brown',
    is_featured: false,
  },
]

export async function seedDatabase() {
  try {
    await initializeDatabase()

    // Clear existing posts for fresh seed
    await sql`DELETE FROM public.posts WHERE author_name IN (${SEED_POSTS.map(p => p.author_name).join(', ')})`

    // Insert seed posts
    for (const post of SEED_POSTS) {
      await sql`
        INSERT INTO public.posts (
          slug, title, excerpt, content, category,
          author_name, author_slug, is_featured
        ) VALUES (
          ${post.slug}, ${post.title}, ${post.excerpt}, ${post.content}, ${post.category},
          ${post.author_name}, ${post.author_slug}, ${post.is_featured}
        )
      `
    }

    console.log('[v0] Database seeded successfully with', SEED_POSTS.length, 'posts')
    return true
  } catch (error: any) {
    console.error('[v0] Seeding error:', error)
    return false
  }
}
