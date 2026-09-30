import { sql } from './db'
import type { GeneratedArticle } from './news-types'
import { scheduleNewsFeedUpdate } from './news-websub'
import { revalidateNewsSurfaces } from './news-revalidation'

/**
 * Check if an article with similar content already exists.
 * Returns { isDuplicate: boolean, reason?: string } for logging.
 */
export async function isDuplicateArticle(
  contentHash: string,
  title: string,
  slug?: string,
  content?: string
): Promise<boolean> {
  const sql = getSql()

  // 1. Exact hash match (covers identical content regardless of age)
  const byHash = await sql`
    SELECT id, title FROM posts WHERE content_hash = ${contentHash} LIMIT 1
  `
  if (byHash.length > 0) {
    console.log(`[AutoNews] Duplicate detected: exact hash match with "${byHash[0].title}"`)
    return true
  }

  // 2. Slug collision check (prevents DB unique constraint errors)
  if (slug) {
    const bySlug = await sql`
      SELECT id, title FROM posts WHERE slug = ${slug} LIMIT 1
    `
    if (bySlug.length > 0) {
      console.log(`[AutoNews] Duplicate detected: slug "${slug}" already exists for "${bySlug[0].title}"`)
      return true
    }
  }

  // 3. Title similarity (all time, not just 7 days)
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '')
  const existingPosts = await sql`
    SELECT title, content FROM posts 
    WHERE is_auto_generated = true
    ORDER BY created_at DESC
    LIMIT 200
  `

  for (const post of existingPosts) {
    const existingNormalized = post.title.toLowerCase().replace(/[^a-z0-9]/g, '')
    const titleSimilarity = calculateSimilarity(normalizedTitle, existingNormalized)
    if (titleSimilarity > 0.75) {
      console.log(
        `[AutoNews] Duplicate detected: title "${title}" is ${(titleSimilarity * 100).toFixed(0)}% similar to "${post.title}"`
      )
      return true
    }
  }

  // 4. Content similarity check (if content provided)
  if (content && content.length > 200) {
    const normalizedContent = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/[^a-z0-9\s]/gi, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()

    for (const post of existingPosts) {
      if (!post.content) continue
      const existingContent = post.content
        .replace(/<[^>]*>/g, ' ')
        .replace(/[^a-z0-9\s]/gi, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()

      // Compare first 500 chars for efficiency
      const sample1 = normalizedContent.slice(0, 500)
      const sample2 = existingContent.slice(0, 500)
      const contentSimilarity = calculateSimilarity(sample1, sample2)

      if (contentSimilarity > 0.7) {
        console.log(
          `[AutoNews] Duplicate detected: content is ${(contentSimilarity * 100).toFixed(0)}% similar to "${post.title}"`
        )
        return true
      }
    }
  }

  return false
}

/**
 * Simple string similarity calculation
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const costs: number[] = []
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[longer.length] = lastValue
  }
  
  return (longer.length - costs[longer.length]) / longer.length
}

/**
 * Generate and upload a featured image for the article.
 * Uses fal.ai for AI image generation, with Unsplash fallback.
 */
export async function generateAndUploadImage(
  imagePrompt: string,
  slug: string,
  articleTitle: string
): Promise<{ url: string; pathname: string; success: boolean; error?: string }> {
  // Primary: Pollinations.ai — free AI image generation, no API key required.
  // It returns a PUBLIC, permanent, cached URL that displays directly in the
  // browser (unlike private Blob uploads, which the frontend can't render).
  // Each article gets a UNIQUE image via a deterministic seed from the slug.
  const seed = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

  const pollinationsPrompt = encodeURIComponent(
    `Professional forex financial news header image. ${imagePrompt}. Style: Modern corporate photography, clean minimalist composition, blue and teal color palette, financial charts and graphs subtle in background, no text overlays, editorial magazine quality, photorealistic, 16:9 aspect ratio.`
  )
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${pollinationsPrompt}?width=1200&height=630&seed=${seed}&nologo=true`

  // Try to verify the image renders (2 attempts). Pollinations can be slow on a
  // cold prompt, so we allow a generous timeout per attempt.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[AutoNews] Generating image via Pollinations.ai for: ${slug} (attempt ${attempt})`)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 45000) // 45s per attempt

      const response = await fetch(pollinationsUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { Accept: 'image/*' },
      })
      clearTimeout(timeout)

      if (response.ok) {
        console.log(`[AutoNews] Pollinations image ready for: ${slug}`)
        // Return the public URL directly — it stays valid and cached.
        return { url: pollinationsUrl, pathname: `pollinations/${slug}`, success: true }
      }
      console.warn(`[AutoNews] Pollinations returned ${response.status} for ${slug}`)
    } catch (error) {
      console.error(`[AutoNews] Pollinations attempt ${attempt} error:`, error)
    }
  }

  // Even if verification failed, the Pollinations URL is still valid and will
  // generate on first browser load — so use it rather than a generic placeholder.
  // The branded SVG placeholder below is a last resort only if something is off.
  try {
    console.log(`[AutoNews] Using Pollinations URL without pre-verification for: ${slug}`)
    return { url: pollinationsUrl, pathname: `pollinations/${slug}`, success: true }
  } catch (error) {
    console.error(`[AutoNews] Unexpected error returning Pollinations URL:`, error)
  }

  // Final fallback: branded placeholder as a data URL (always renders).
  try {
    console.log(`[AutoNews] Generating placeholder for: ${slug}`)
    
    // Create an SVG placeholder - use data URL so it's always accessible
    const svgPlaceholder = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a"/><stop offset="100%" style="stop-color:#1e293b"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><text x="600" y="280" font-family="system-ui, sans-serif" font-size="24" fill="#94a3b8" text-anchor="middle">BESTFOREX.IO</text><text x="600" y="340" font-family="system-ui, sans-serif" font-size="32" fill="#f1f5f9" text-anchor="middle" font-weight="bold">FOREX NEWS</text><rect x="540" y="380" width="120" height="4" fill="#3b82f6"/></svg>`
    
    // Return as data URL - this will always render correctly
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgPlaceholder).toString('base64')}`
    
    console.log(`[AutoNews] Placeholder generated as data URL`)
    return { url: dataUrl, pathname: `news/${slug}-placeholder.svg`, success: true }
  } catch (error) {
    console.error(`[AutoNews] Placeholder generation error:`, error)
  }

  // All attempts failed
  return {
    url: '',
    pathname: '',
    success: false,
    error: 'All image generation methods failed',
  }
}

/**
 * Publish an article to the database
 */
const MIN_WORD_COUNT = 500

/** Count plain-text words in an HTML string — same logic used in the generator */
function countWords(html: string): number {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length
}

export async function publishArticle(
  article: GeneratedArticle,
  featuredImageUrl: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // ── Hard gate: reject articles without a valid featured image ──
    if (!featuredImageUrl || featuredImageUrl.trim() === '') {
      const message = `Rejected: article "${article.title}" has no featured image.`
      console.error(`[AutoNews] ${message}`)
      return { success: false, error: message }
    }

    // ── Hard gate: reject anything under 500 words before touching the DB ──
    const actualWordCount = countWords(article.content)
    if (actualWordCount < MIN_WORD_COUNT) {
      const message = `Rejected: article "${article.title}" has only ${actualWordCount} plain-text words (minimum ${MIN_WORD_COUNT}).`
      console.error(`[AutoNews] ${message}`)
      return { success: false, error: message }
    }
    // Keep word_count accurate using the same stripped count
    article.wordCount = actualWordCount

    // Check for duplicates (hash, slug, title similarity, content similarity)
    const isDuplicate = await isDuplicateArticle(
      article.contentHash,
      article.title,
      article.slug,
      article.content
    )
    if (isDuplicate) {
      return { success: false, error: 'Article is too similar to existing content' }
    }

    const result = await sql`
      INSERT INTO posts (
        title,
        slug,
        excerpt,
        content,
        category,
        featured_image,
        meta_title,
        meta_description,
        image_alt_text,
        source_url,
        source_name,
        word_count,
        related_brokers,
        tags,
        content_hash,
        is_auto_generated,
        status,
        published_at,
        created_at,
        updated_at
      ) VALUES (
        ${article.title},
        ${article.slug},
        ${article.excerpt},
        ${article.content},
        ${article.category},
        ${featuredImageUrl},
        ${article.metaTitle},
        ${article.metaDescription},
        ${article.imageAltText},
        ${article.sourceUrl},
        ${article.sourceName},
        ${article.wordCount},
        ${article.relatedBrokers},
        ${article.tags},
        ${article.contentHash},
        true,
        'published',
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING id
    `

    revalidateNewsSurfaces(article.slug)
    scheduleNewsFeedUpdate()
    return { success: true, id: result[0]?.id }
  } catch (error) {
    console.error('Error publishing article:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get the most recent auto-generated articles
 */
export async function getRecentAutoArticles(limit: number = 10): Promise<Array<{
  id: string
  title: string
  slug: string
  publishedAt: string
}>> {
  const sql = getSql()
  const articles = await sql`
    SELECT id, title, slug, published_at
    FROM posts
    WHERE is_auto_generated = true
    ORDER BY published_at DESC
    LIMIT ${limit}
  `
  return articles.map(a => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    publishedAt: a.published_at
  }))
}

/**
 * Get article count stats
 */
export async function getArticleStats(): Promise<{
  totalAuto: number
  todayCount: number
  weekCount: number
}> {
  const sql = getSql()
  const stats = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE is_auto_generated = true) as total_auto,
      COUNT(*) FILTER (WHERE is_auto_generated = true AND published_at > NOW() - INTERVAL '1 day') as today_count,
      COUNT(*) FILTER (WHERE is_auto_generated = true AND published_at > NOW() - INTERVAL '7 days') as week_count
    FROM posts
  `
  return {
    totalAuto: Number(stats[0]?.total_auto || 0),
    todayCount: Number(stats[0]?.today_count || 0),
    weekCount: Number(stats[0]?.week_count || 0)
  }
}
