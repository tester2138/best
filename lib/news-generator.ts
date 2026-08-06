import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { KNOWN_BROKERS, DEFAULT_NEWS_CONFIG, FOREX_BRAND_REQUIRED_KEYWORDS, OFF_TOPIC_DISQUALIFIERS, type GeneratedArticle } from './news-types'
import { generateContentHash } from './news-fetcher'

/**
 * Generate a complete SEO-optimized article from a news topic
 */
export async function generateArticle(
  topic: string,
  description: string,
  sourceName: string,
  sourceUrl: string
): Promise<GeneratedArticle> {
  const brokerList = KNOWN_BROKERS.map(b => `${b.name} (slug: ${b.slug})`).join(', ')
  
  const systemPrompt = `You are a senior B2B financial journalist and SEO expert specializing in the forex and CFD brokerage industry. 
You write for BestForex.io, a professional forex broker comparison platform.

## TOPIC SCOPE — STRICTLY ENFORCED:
You write ONLY about Forex brand-related topics. This means:
ALLOWED: Forex broker news, CFD broker regulation, trading platform updates (MT4/MT5/cTrader), broker acquisitions/mergers, broker licensing, prop trading firms, liquidity providers, broker partnerships, copy trading platforms, retail forex industry trends, broker product launches, broker compliance actions.
NOT ALLOWED: Stock market news, cryptocurrency price movements, commodity prices (oil/gold), real estate, generic macroeconomic data (GDP/CPI/unemployment) with no broker angle, hedge fund returns, bond yields, ETF performance.
If the topic is off-scope, still write the best possible Forex BRAND angle you can extract from the context, or pivot to a closely related broker topic.

## CONTENT REQUIREMENTS:
1. MINIMUM 500 words (aim for 550-700 words) — articles under 500 words will be rejected
2. Professional, authoritative tone with original analysis
3. Include industry insights, statistics, and expert context
4. 100% unique content — never copy text verbatim from sources

## ORIGINALITY REQUIREMENTS (CRITICAL — articles will be rejected if not followed):
1. COMPLETELY REWRITE the source information — do not copy ANY phrases of 4+ words
2. Use different sentence structures than the source — transform passive to active voice and vice versa
3. Add an "Analysis" or "Industry Implications" section with YOUR OWN expert commentary
4. Include relevant statistics, market data, or historical context NOT in the source
5. Add a "Looking Ahead" or "What This Means" conclusion with forward-looking insights
6. Reference industry trends, regulatory context, or competitive landscape
7. Use synonyms and alternative phrasing throughout — never mirror source wording
8. The opening paragraph must be COMPLETELY DIFFERENT from the source title/description

## SEO REQUIREMENTS (CRITICAL):
1. Meta title: 50-60 characters, include primary keyword
2. Meta description: 150-160 characters, compelling call-to-action, include keyword
3. Article must have AT LEAST 2-3 H2 headings and 1-2 H3 subheadings
4. Include 5-8 relevant SEO tags/keywords
5. Image alt text must be descriptive (20+ characters), NOT just the article title
6. Slug must be lowercase, hyphenated, under 60 characters
7. Excerpt: 100-160 characters for card displays

## HTML STRUCTURE REQUIREMENTS:
- Use <p> for paragraphs (minimum 5 paragraphs)
- Use <h2> for main sections (minimum 2)
- Use <h3> for subsections where appropriate
- Use <ul>/<li> for lists
- Use <strong> for emphasis on key terms
- Include internal links to brokers: <a href="/BROKER_SLUG">Broker Name</a>

Available brokers for internal linking: ${brokerList}

Target audience: Forex traders, institutional investors, and B2B industry professionals.

IMPORTANT: Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "title": "SEO-optimized article title, 50-70 characters with primary keyword",
  "slug": "lowercase-hyphenated-slug-under-60-chars",
  "excerpt": "Compelling 100-160 character summary for cards and snippets",
  "content": "<h2>First Section Heading</h2><p>Content with proper structure...</p><h2>Second Section</h2><p>More content...</p>",
  "category": "Category name",
  "metaTitle": "SEO meta title 50-60 chars with keyword | BestForex.io",
  "metaDescription": "Compelling 150-160 char meta description with keyword and call-to-action.",
  "imagePrompt": "Detailed prompt for professional forex/finance featured image",
  "imageAltText": "Descriptive alt text explaining the image content (20+ chars, NOT the title)",
  "tags": ["primary-keyword", "secondary-keyword", "forex", "trading", "broker-name"],
  "relatedBrokers": ["broker-slug-1", "broker-slug-2"]
}`

  // Detect brokers mentioned in the source content BEFORE generation
  const sourceBrokers = findRelatedBrokers(`${topic} ${description}`)
  const detectedBrokersList = sourceBrokers.length > 0
    ? `\n\nDETECTED BROKERS IN SOURCE (you MUST include internal links to these):\n${sourceBrokers.map(b => `- ${b.name}: <a href="/brokers/${b.slug}">${b.name}</a>`).join('\n')}`
    : ''

  const userPrompt = `Write a comprehensive news article about the following topic:

TOPIC: ${topic}
CONTEXT: ${description}
SOURCE: ${sourceName}
${detectedBrokersList}

Requirements:
1. Create a unique, professionally written article (minimum 500 words)
2. Add your own analysis, insights, and industry context
3. Include relevant statistics or market data where appropriate
4. Structure with clear headings (H2, H3) in the HTML content
5. You MUST include internal links to any forex brokers mentioned using format: <a href="/broker-slug">Broker Name</a>
6. Make the article informative for B2B forex industry readers
7. DO NOT copy the source content - paraphrase and expand with original insights

Generate the complete article with all SEO elements as JSON.`

  const MAX_ATTEMPTS = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // On retry attempts, make requirements more forceful based on previous failures
      let attemptUserPrompt = userPrompt
      if (attempt > 1) {
        const retryInstructions = `

CRITICAL RETRY INSTRUCTIONS (attempt ${attempt}/${MAX_ATTEMPTS}):
Your previous response was rejected. This attempt MUST fix these issues:

1. WORD COUNT: Produce AT LEAST 500 plain-text words. Expand every section.

2. ORIGINALITY: Your content was TOO SIMILAR to the source. You MUST:
   - Completely rewrite every sentence — do NOT use any phrases from the source
   - Start with a completely different opening paragraph
   - Add your own "Analysis" section with expert commentary
   - Include industry statistics or historical context not in the source
   - Add a "What This Means for Traders" or "Looking Ahead" conclusion
   - Use synonyms throughout — pretend you cannot see the source text

3. STRUCTURE: Include at least 2 H2 headings and 1 H3 subheading

The source content is just a TOPIC SEED — write an entirely NEW article on this topic.`
        attemptUserPrompt = userPrompt + retryInstructions
      }

      const { text } = await generateText({
        model: gateway('anthropic/claude-sonnet-4'),
        system: systemPrompt,
        prompt: attemptUserPrompt,
        temperature: 0.7,
      })

      // Clean up the response and parse JSON with robust error handling
      let cleanedText = text.trim()
      
      // Remove markdown code blocks
      if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7)
      if (cleanedText.startsWith('```')) cleanedText = cleanedText.slice(3)
      if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3)
      cleanedText = cleanedText.trim()
      
      // Extract JSON object if there's extra text around it
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }
      
      // Fix common JSON issues from LLMs
      // Remove only problematic control characters, keep newlines/tabs as-is (they're valid in JSON)
      cleanedText = cleanedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(cleanedText)
      } catch (jsonError) {
        console.error(`[AutoNews] JSON parse error:`, jsonError)
        console.error(`[AutoNews] Raw text (first 500 chars):`, cleanedText.slice(0, 500))
        
        // Last resort: try to extract key fields manually
        const titleMatch = cleanedText.match(/"title"\s*:\s*"([^"]+)"/)
        const slugMatch = cleanedText.match(/"slug"\s*:\s*"([^"]+)"/)
        const contentMatch = cleanedText.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"(?:category|metaTitle)|"\s*})/)
        
        if (titleMatch && contentMatch) {
          console.log(`[AutoNews] Attempting manual field extraction...`)
          parsed = {
            title: titleMatch[1],
            slug: slugMatch?.[1] || generateSlug(titleMatch[1]),
            content: contentMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
            excerpt: titleMatch[1].slice(0, 150),
            category: 'Broker News',
            metaTitle: titleMatch[1],
            metaDescription: titleMatch[1].slice(0, 160),
            imagePrompt: `Professional forex news image for: ${titleMatch[1]}`,
            imageAltText: `Featured image for ${titleMatch[1]}`,
            tags: ['forex', 'broker', 'trading'],
            relatedBrokers: []
          }
        } else {
          throw new Error(`Failed to parse JSON and manual extraction failed: ${jsonError}`)
        }
      }

      // Narrow parsed (Record<string,unknown>) to a typed shape for safe field access
      interface ParsedArticle {
        content: string
        title: string
        slug?: string
        excerpt: string
        category?: string
        metaTitle?: string
        metaDescription?: string
        imagePrompt?: string
        imageAltText?: string
        tags?: string[]
        relatedBrokers?: string[]
      }
      const p = parsed as unknown as ParsedArticle

      // Strip all HTML tags and collapse whitespace before counting words
      const plainText = p.content
        .replace(/<[^>]*>/g, ' ')   // replace tags with a space
        .replace(/&[a-z]+;/gi, ' ') // replace HTML entities (e.g. &amp;)
        .replace(/\s+/g, ' ')       // collapse consecutive whitespace
        .trim()
      const wordCount = plainText.split(' ').filter(Boolean).length

      if (wordCount < DEFAULT_NEWS_CONFIG.minWordCount) {
        console.warn(
          `[AutoNews] Attempt ${attempt}/${MAX_ATTEMPTS}: article "${p.title}" has only ${wordCount} words (minimum: ${DEFAULT_NEWS_CONFIG.minWordCount}). Retrying…`
        )
        lastError = new Error(
          `Article too short: ${wordCount} words (minimum ${DEFAULT_NEWS_CONFIG.minWordCount})`
        )
        continue // retry
      }

      // Check originality against source content
      const originality = checkContentOriginality(p.content, topic, description)
      console.log(`[AutoNews] Attempt ${attempt}/${MAX_ATTEMPTS}: originality score ${(originality.originalityScore * 100).toFixed(0)}%`)

      if (!originality.isOriginal) {
        console.warn(
          `[AutoNews] Attempt ${attempt}/${MAX_ATTEMPTS}: article failed originality check — ${originality.issues.join('; ')}`
        )
        lastError = new Error(`Insufficient originality: ${originality.issues.join('; ')}`)
        // Will retry with stronger prompt on next attempt
        continue
      }

      const contentHash = generateContentHash(p.title, p.content)

      const article: GeneratedArticle = {
        title: p.title,
        slug: p.slug || generateSlug(p.title),
        excerpt: p.excerpt,
        content: p.content,
        category: p.category || 'Broker News',
        metaTitle: p.metaTitle || p.title,
        metaDescription: p.metaDescription || p.excerpt,
        imagePrompt: p.imagePrompt || `Professional forex trading finance image for: ${p.title}`,
        imageAltText: p.imageAltText || p.title,
        tags: p.tags || [],
        relatedBrokers: p.relatedBrokers || [],
        wordCount,
        contentHash,
        sourceUrl,
        sourceName,
      }

      console.log(`[AutoNews] Attempt ${attempt}/${MAX_ATTEMPTS}: generated "${article.title}" — ${wordCount} words`)
      return article

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`[AutoNews] Attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message)
    }
  }

  throw lastError ?? new Error('Failed to generate article content after maximum retries')
}

/**
 * Calculate text similarity using normalized Levenshtein-like comparison.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  // Normalize both texts: lowercase, remove punctuation, collapse whitespace
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const norm1 = normalize(text1)
  const norm2 = normalize(text2)

  if (norm1 === norm2) return 1
  if (norm1.length === 0 || norm2.length === 0) return 0

  // Use trigram similarity for efficiency on longer texts
  const getTrigrams = (str: string): Set<string> => {
    const trigrams = new Set<string>()
    for (let i = 0; i <= str.length - 3; i++) {
      trigrams.add(str.slice(i, i + 3))
    }
    return trigrams
  }

  const trigrams1 = getTrigrams(norm1)
  const trigrams2 = getTrigrams(norm2)

  let intersection = 0
  for (const tri of trigrams1) {
    if (trigrams2.has(tri)) intersection++
  }

  const union = trigrams1.size + trigrams2.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Check if generated content is sufficiently original compared to source.
 * Returns originality score (0-1) and specific issues found.
 */
export function checkContentOriginality(
  generatedContent: string,
  sourceTitle: string,
  sourceDescription: string
): { originalityScore: number; isOriginal: boolean; issues: string[] } {
  const issues: string[] = []

  // Normalize generated content for comparison
  const generatedPlain = generatedContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Check title similarity
  const titleSimilarity = calculateTextSimilarity(sourceTitle, generatedPlain.slice(0, 200))
  if (titleSimilarity > 0.6) {
    issues.push(`Opening too similar to source title (${(titleSimilarity * 100).toFixed(0)}% match)`)
  }

  // Check description similarity
  const descSimilarity = calculateTextSimilarity(sourceDescription, generatedPlain)
  if (descSimilarity > 0.4) {
    issues.push(`Content too similar to source description (${(descSimilarity * 100).toFixed(0)}% match)`)
  }

  // Check for copied phrases (4+ word sequences)
  const sourceWords = sourceDescription.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const generatedLower = generatedPlain.toLowerCase()
  let copiedPhraseCount = 0

  for (let i = 0; i <= sourceWords.length - 4; i++) {
    const phrase = sourceWords.slice(i, i + 4).join(' ')
    if (phrase.length > 15 && generatedLower.includes(phrase)) {
      copiedPhraseCount++
    }
  }

  if (copiedPhraseCount > 2) {
    issues.push(`Found ${copiedPhraseCount} copied phrases from source (4+ word sequences)`)
  }

  // Check for required original elements
  const hasAnalysisSection = /<h[23][^>]*>[^<]*(analysis|insight|outlook|implications|impact)/i.test(generatedContent)
  const hasExpertContext = /according to|experts|analysts|industry|market data|statistics/i.test(generatedPlain)
  const hasOriginalConclusion = /<h[23][^>]*>[^<]*(conclusion|summary|looking ahead|what this means)/i.test(generatedContent)

  if (!hasAnalysisSection) {
    issues.push('Missing analysis/insight section — required for originality')
  }
  if (!hasExpertContext) {
    issues.push('Missing expert context or industry data — add original insights')
  }
  if (!hasOriginalConclusion) {
    issues.push('Missing conclusion/outlook section — add forward-looking analysis')
  }

  // Calculate overall originality score
  const similarityPenalty = Math.max(titleSimilarity * 0.3, descSimilarity * 0.5)
  const phrasePenalty = Math.min(copiedPhraseCount * 0.1, 0.3)
  const structurePenalty = (!hasAnalysisSection ? 0.1 : 0) + (!hasExpertContext ? 0.1 : 0) + (!hasOriginalConclusion ? 0.05 : 0)

  const originalityScore = Math.max(0, 1 - similarityPenalty - phrasePenalty - structurePenalty)

  // Minimum threshold: 60% originality required
  const isOriginal = originalityScore >= 0.6 && issues.filter(i => i.includes('too similar') || i.includes('copied phrases')).length === 0

  return { originalityScore, isOriginal, issues }
}

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .slice(0, 60)
}

/**
 * Auto-fix common SEO issues where possible
 */
export function autoFixSeoIssues(article: GeneratedArticle): GeneratedArticle {
  const fixed = { ...article }

  // Fix slug format
  fixed.slug = fixed.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  // Ensure meta title exists and has reasonable length
  if (!fixed.metaTitle || fixed.metaTitle.length < 20) {
    fixed.metaTitle = fixed.title.slice(0, 60)
  }
  // Truncate overly long meta titles
  if (fixed.metaTitle.length > 70) {
    fixed.metaTitle = fixed.metaTitle.slice(0, 67) + '...'
  }

  // Ensure meta description exists and has reasonable length
  if (!fixed.metaDescription || fixed.metaDescription.length < 50) {
    fixed.metaDescription = fixed.excerpt.slice(0, 160)
  }
  // Truncate overly long meta descriptions
  if (fixed.metaDescription.length > 170) {
    fixed.metaDescription = fixed.metaDescription.slice(0, 157) + '...'
  }

  // Ensure image alt text is not just the title
  if (!fixed.imageAltText || fixed.imageAltText === fixed.title || fixed.imageAltText.length < 20) {
    fixed.imageAltText = `Featured image for article: ${fixed.title.slice(0, 80)}`
  }

  // Ensure minimum tags
  if (fixed.tags.length < 3) {
    const defaultTags = ['forex', 'trading', 'broker news', 'financial markets', 'forex industry']
    while (fixed.tags.length < 5) {
      const tagToAdd = defaultTags[fixed.tags.length]
      if (tagToAdd && !fixed.tags.includes(tagToAdd)) {
        fixed.tags.push(tagToAdd)
      } else {
        break
      }
    }
  }

  // Ensure excerpt is reasonable
  if (!fixed.excerpt || fixed.excerpt.length < 50) {
    // Extract first sentence from content as excerpt
    const plainText = fixed.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const firstSentence = plainText.split(/[.!?]/)[0]
    fixed.excerpt = firstSentence.slice(0, 160)
  }

  return fixed
}

/**
 * Generate an SEO-optimized image prompt for the article
 */
export async function generateImagePrompt(
  title: string,
  category: string
): Promise<string> {
  const { text } = await generateText({
    model: gateway('anthropic/claude-sonnet-4'),
    prompt: `Create a detailed image generation prompt for a professional forex/finance news article cover image.

Article title: "${title}"
Category: ${category}

Requirements:
- Professional, corporate style
- Financial/forex theme
- Modern, clean aesthetic
- No text in the image
- Suitable for a news website header

Generate a single detailed prompt (50-100 words) for creating this image.`,
    temperature: 0.6,
  })

  return text.trim()
}

/**
 * Find related brokers mentioned in content.
 * Returns array of broker objects with name and slug for linking.
 */
export function findRelatedBrokers(content: string): Array<{ name: string; slug: string }> {
  const found: Array<{ name: string; slug: string }> = []
  const contentLower = content.toLowerCase()

  for (const broker of KNOWN_BROKERS) {
    // Check primary name and all aliases
    const allNames = [broker.name.toLowerCase(), ...broker.aliases.map(a => a.toLowerCase())]
    for (const name of allNames) {
      // Use word boundary check to avoid false positives (e.g., "axis" matching "axi")
      const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (regex.test(contentLower)) {
        if (!found.some(b => b.slug === broker.slug)) {
          found.push({ name: broker.name, slug: broker.slug })
        }
        break
      }
    }
  }

  return found
}

/**
 * Inject internal links into HTML content for detected brokers.
 * Only links the FIRST mention of each broker to avoid over-linking.
 */
export function injectBrokerLinks(
  content: string,
  brokers: Array<{ name: string; slug: string }>
): string {
  let result = content

  for (const broker of brokers) {
    // Skip if this broker is already linked in the content
    const existingLinkRegex = new RegExp(`<a[^>]+href=["']/brokers/${broker.slug}["'][^>]*>`, 'i')
    if (existingLinkRegex.test(result)) {
      continue
    }

    // Build pattern to match broker name or aliases (first occurrence only)
    const allNames = [broker.name, ...KNOWN_BROKERS.find(b => b.slug === broker.slug)?.aliases || []]
    
    for (const name of allNames) {
      // Match the name but NOT if it's already inside an <a> tag or its href
      // Use a regex that captures the name with word boundaries
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(
        `(?<!<a[^>]*>)(?<!href=["'][^"']*)(\\b)(${escapedName})(\\b)(?![^<]*<\\/a>)`,
        'i'
      )

      if (pattern.test(result)) {
        result = result.replace(
          pattern,
          `$1<a href="/brokers/${broker.slug}">${broker.name}</a>$3`
        )
        break // Only link first match
      }
    }
  }

  return result
}

/**
 * Validate article meets minimum SEO, content, and originality requirements.
 * Re-strips HTML so the check is always against plain-text word count.
 */
export function validateArticle(
  article: GeneratedArticle,
  sourceTitle?: string,
  sourceDescription?: string
): { valid: boolean; errors: string[]; warnings: string[]; originalityScore?: number } {
  const errors: string[] = []
  const warnings: string[] = []
  let originalityScore: number | undefined

  // ─────────────────────────────────────────────────────────────────────────
  // WORD COUNT VALIDATION
  // ─────────────────────────────────────────────────────────────────────────
  const plainWordCount = article.content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length

  article.wordCount = plainWordCount

  if (plainWordCount < DEFAULT_NEWS_CONFIG.minWordCount) {
    errors.push(
      `Article has ${plainWordCount} plain-text words — minimum is ${DEFAULT_NEWS_CONFIG.minWordCount}`
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TITLE VALIDATION (SEO: 50-70 chars optimal)
  // ─────────────────────────────────────────────────────────────────────────
  if (article.title.length < 20) {
    errors.push(`Title too short: ${article.title.length} chars (minimum 20)`)
  }
  if (article.title.length > 80) {
    warnings.push(`Title may be truncated in search results: ${article.title.length} chars (optimal: 50-70)`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // META TITLE VALIDATION (SEO: 50-60 chars optimal)
  // ─────────────────────────────────────────────────────────────────────────
  if (article.metaTitle.length < 30) {
    errors.push(`Meta title too short: ${article.metaTitle.length} chars (minimum 30)`)
  }
  if (article.metaTitle.length > 70) {
    warnings.push(`Meta title may be truncated: ${article.metaTitle.length} chars (optimal: 50-60)`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // META DESCRIPTION VALIDATION (SEO: 150-160 chars optimal)
  // ───────────────────────────────────────────────────────────��─────────────
  if (article.metaDescription.length < 50) {
    errors.push(`Meta description too short: ${article.metaDescription.length} chars (minimum 50)`)
  }
  if (article.metaDescription.length < 100) {
    warnings.push(`Meta description is short: ${article.metaDescription.length} chars (recommended: 100-160)`)
  }
  if (article.metaDescription.length > 170) {
    warnings.push(`Meta description may be truncated: ${article.metaDescription.length} chars (optimal: 150-160)`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEADING STRUCTURE VALIDATION (SEO: must have H2/H3 hierarchy)
  // ──────────────────────────────────────────────��──────────────────────────
  const h2Count = (article.content.match(/<h2[^>]*>/gi) || []).length
  const h3Count = (article.content.match(/<h3[^>]*>/gi) || []).length

  if (h2Count === 0) {
    errors.push('Article has no H2 headings — required for SEO structure')
  }
  if (h2Count > 0 && h2Count < 2) {
    warnings.push(`Article has only ${h2Count} H2 heading — consider adding more sections`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TAGS VALIDATION (SEO: 5-8 tags optimal)
  // ─────────────────────────────────────────────────────────────────────────
  if (article.tags.length < 3) {
    errors.push(`Article has only ${article.tags.length} tags — minimum 3 required`)
  }
  if (article.tags.length < 5) {
    warnings.push(`Article has ${article.tags.length} tags — 5-8 tags recommended for SEO`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IMAGE ALT TEXT VALIDATION (must be descriptive, not just title)
  // ─────────────────────────────────────────────────────────────────────────
  if (!article.imageAltText || article.imageAltText.length < 20) {
    errors.push('Image alt text too short — must be descriptive (20+ chars)')
  }
  if (article.imageAltText === article.title) {
    warnings.push('Image alt text is identical to title — consider making it more descriptive')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SLUG VALIDATION (SEO: lowercase, hyphens, no special chars)
  // ─────────────────────────────────────────────────────────────────────────
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/
  if (!slugPattern.test(article.slug)) {
    errors.push(`Slug "${article.slug}" is not SEO-friendly — must be lowercase with hyphens only`)
  }
  if (article.slug.length > 60) {
    warnings.push(`Slug is ${article.slug.length} chars — shorter slugs (under 60) perform better`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL LINKS VALIDATION (SEO: should link to related content)
  // ─────────────────────────────────────────────────────────────────────────
  const internalLinks = article.content.match(/<a\s+href=["']\/[^"']+["'][^>]*>/gi) || []
  const internalLinkCount = internalLinks.length

  // Check if any brokers are mentioned but not linked
  const detectedBrokers = findRelatedBrokers(article.content)
  const linkedBrokerSlugs = internalLinks
    .map(link => {
      const match = link.match(/href=["']\/([^"']+)["']/)
      return match ? match[1] : null
    })
    .filter(Boolean)

  const unlinkedBrokers = detectedBrokers.filter(b => !linkedBrokerSlugs.includes(b.slug))
  
  if (unlinkedBrokers.length > 0) {
    warnings.push(
      `${unlinkedBrokers.length} broker(s) mentioned but not linked: ${unlinkedBrokers.map(b => b.name).join(', ')}`
    )
  }

  if (internalLinkCount === 0 && detectedBrokers.length > 0) {
    warnings.push('Article mentions brokers but has no internal links — links should be auto-injected')
  }
  
  if (internalLinkCount > 0) {
    // Log success for monitoring
    console.log(`[AutoNews] Article has ${internalLinkCount} internal link(s) to: ${linkedBrokerSlugs.join(', ')}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXCERPT VALIDATION (used for snippets and cards)
  // ─────────────────────────────────────────────────────────────────────────
  if (article.excerpt.length < 50) {
    errors.push(`Excerpt too short: ${article.excerpt.length} chars (minimum 50)`)
  }
  if (article.excerpt.length > 200) {
    warnings.push(`Excerpt may be truncated: ${article.excerpt.length} chars (optimal: 100-160)`)
  }

  // ──────────────────────────────────────────────────────────���─────��─��──────
  // PARAGRAPH STRUCTURE VALIDATION (SEO: avoid walls of text)
  // ───────────���─────────────────────────────────────────────────────────────
  const paragraphCount = (article.content.match(/<p[^>]*>/gi) || []).length
  if (paragraphCount < 3) {
    warnings.push(`Article has only ${paragraphCount} paragraphs — consider breaking up content`)
  }

  // ────────────────────────────────────────────���────────────────────────────
  // TOPIC RELEVANCE VALIDATION — final check on generated content
  // ─────────────────────────────────────────────────────────────────────────
  const combinedText = `${article.title} ${article.excerpt} ${article.tags.join(' ')}`.toLowerCase()

  // Reject if off-topic keyword is in the final generated content as a main subject
  for (const disqualifier of OFF_TOPIC_DISQUALIFIERS) {
    if (combinedText.includes(disqualifier.toLowerCase())) {
      errors.push(`Generated article contains off-topic subject: "${disqualifier}"`)
      break
    }
  }

  // Warn if no Forex brand keyword appears anywhere in title/excerpt/tags
  const hasForexSignal = FOREX_BRAND_REQUIRED_KEYWORDS.some(kw =>
    combinedText.includes(kw.toLowerCase())
  )
  if (!hasForexSignal) {
    warnings.push('Article title/excerpt/tags contain no Forex brand keyword — verify topic relevance')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ORIGINALITY VALIDATION — ensure content is sufficiently rewritten
  // ─────────────────────────────────────────────────────────────────────────
  if (sourceTitle && sourceDescription) {
    const originality = checkContentOriginality(article.content, sourceTitle, sourceDescription)
    originalityScore = originality.originalityScore

    if (!originality.isOriginal) {
      errors.push(`Content failed originality check (${(originality.originalityScore * 100).toFixed(0)}%): ${originality.issues.join('; ')}`)
    } else if (originality.originalityScore < 0.75) {
      warnings.push(`Originality score is ${(originality.originalityScore * 100).toFixed(0)}% — consider more unique phrasing`)
    }

    // Log originality issues as warnings even if passing
    for (const issue of originality.issues) {
      if (!errors.some(e => e.includes(issue)) && !warnings.some(w => w.includes(issue))) {
        warnings.push(`Originality: ${issue}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    originalityScore
  }
}
