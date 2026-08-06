import { fetchLatestForexNews, generateContentHash, isForexBrandRelevant } from './news-fetcher'
import { generateArticle, validateArticle, findRelatedBrokers, autoFixSeoIssues, injectBrokerLinks } from './news-generator'
import { publishArticle, generateAndUploadImage, isDuplicateArticle, getArticleStats } from './news-publisher'

export type NewsGenerationResult = {
  success: boolean
  articlesGenerated: number
  articles: Array<{
    title: string
    slug: string
    wordCount: number
    success: boolean
    error?: string
    seoWarnings?: string[]
  }>
  errors: string[]
}

/**
 * Main orchestrator function that runs the complete news generation pipeline
 * Called every 6 hours via cron job
 */
export async function runNewsGenerationPipeline(
  articlesToGenerate: number = 2
): Promise<NewsGenerationResult> {
  const result: NewsGenerationResult = {
    success: false,
    articlesGenerated: 0,
    articles: [],
    errors: []
  }

  try {
    console.log(`[AutoNews] Starting pipeline - generating ${articlesToGenerate} articles`)

    // Step 1: Fetch latest forex news
    const newsItems = await fetchLatestForexNews()
    console.log(`[AutoNews] Fetched ${newsItems.length} news items`)

    if (newsItems.length === 0) {
      result.errors.push('No news items found')
      return result
    }

    // Step 2: Generate articles from news items
    let generated = 0
    for (const newsItem of newsItems) {
      if (generated >= articlesToGenerate) break

      try {
        console.log(`[AutoNews] Processing: ${newsItem.title}`)

        // Gate 1: Topic relevance — must be Forex brand related
        const relevance = isForexBrandRelevant(newsItem.title, newsItem.description)
        if (!relevance.relevant) {
          console.log(`[AutoNews] Skipping off-topic item: "${newsItem.title}" — ${relevance.reason}`)
          result.errors.push(`Skipped off-topic: "${newsItem.title}" — ${relevance.reason}`)
          continue
        }

        // Gate 2: Duplicate check — must not match existing published content
        const sourceHash = generateContentHash(newsItem.title, newsItem.description)
        const potentialDuplicate = await isDuplicateArticle(
          sourceHash,
          newsItem.title,
          undefined, // no slug yet
          newsItem.description // source description
        )

        if (potentialDuplicate) {
          console.log(`[AutoNews] Skipping source topic (potential duplicate): ${newsItem.title}`)
          continue
        }

        // Generate the article
        let article = await generateArticle(
          newsItem.title,
          newsItem.description,
          newsItem.source,
          newsItem.url
        )

        // Auto-fix common SEO issues before validation
        article = autoFixSeoIssues(article)
        console.log(`[AutoNews] Applied SEO auto-fixes to: ${article.slug}`)

        // Validate the article (SEO, content, and originality checks)
        const validation = validateArticle(article, newsItem.title, newsItem.description)
        
        // Log warnings but don't block publication
        if (validation.warnings.length > 0) {
          console.log(`[AutoNews] SEO warnings for "${article.slug}": ${validation.warnings.join('; ')}`)
        }
        
        // Block publication on errors
        if (!validation.valid) {
          console.log(`[AutoNews] Validation FAILED: ${validation.errors.join(', ')}`)
          result.articles.push({
            title: article.title,
            slug: article.slug,
            wordCount: article.wordCount,
            success: false,
            error: `SEO validation failed: ${validation.errors.join(', ')}`
          })
          continue
        }
        
        console.log(`[AutoNews] SEO validation passed for: ${article.slug}`)

        // Find related brokers in the generated content
        const detectedBrokers = findRelatedBrokers(article.content)
        
        // Inject internal links for any broker mentions that aren't already linked
        if (detectedBrokers.length > 0) {
          console.log(`[AutoNews] Detected ${detectedBrokers.length} broker(s) in content: ${detectedBrokers.map(b => b.name).join(', ')}`)
          article.content = injectBrokerLinks(article.content, detectedBrokers)
          console.log(`[AutoNews] Injected internal links for brokers`)
        }
        
        // Store broker slugs for metadata
        article.relatedBrokers = [...new Set([
          ...article.relatedBrokers,
          ...detectedBrokers.map(b => b.slug)
        ])]

        // Generate and upload featured image (optional - article will publish with placeholder if this fails)
        console.log(`[AutoNews] Generating cover image for: ${article.slug}`)
        let imageUrl = '/images/news-placeholder.jpg' // Default placeholder
        
        try {
          const imageResult = await generateAndUploadImage(
            article.imagePrompt,
            article.slug,
            article.title
          )
          
          if (imageResult.success && imageResult.url) {
            imageUrl = imageResult.url
          } else {
            console.warn(`[AutoNews] Image generation failed for: ${article.slug}, using placeholder`)
          }
        } catch (imageError) {
          console.warn(`[AutoNews] Image error for ${article.slug}:`, imageError)
        }

        // Publish the article
        console.log(`[AutoNews] Publishing: ${article.title}`)
        const publishResult = await publishArticle(article, imageUrl)

        if (publishResult.success) {
          generated++
          result.articles.push({
            title: article.title,
            slug: article.slug,
            wordCount: article.wordCount,
            success: true,
            seoWarnings: validation.warnings.length > 0 ? validation.warnings : undefined
          })
          console.log(`[AutoNews] Successfully published: ${article.slug}`)
        } else {
          result.articles.push({
            title: article.title,
            slug: article.slug,
            wordCount: article.wordCount,
            success: false,
            error: publishResult.error
          })
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[AutoNews] Error processing news item:`, error)
        result.errors.push(`Failed to process "${newsItem.title}": ${errorMessage}`)
      }
    }

    result.articlesGenerated = generated
    result.success = generated > 0

    // Log stats
    const stats = await getArticleStats()
    console.log(`[AutoNews] Pipeline complete. Generated: ${generated}. Total auto articles: ${stats.totalAuto}`)

    return result

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Pipeline error: ${errorMessage}`)
    console.error('[AutoNews] Pipeline failed:', error)
    return result
  }
}

/**
 * Generate a single test article (for manual testing)
 */
export async function generateTestArticle(topic: string, description: string): Promise<NewsGenerationResult> {
  return runNewsGenerationPipeline(1)
}
