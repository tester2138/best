import { sql } from './db'
import { Post, Author } from './types'

export async function getPosts(limit = 20, offset = 0) {
  const result = await sql`
    SELECT 
      id, slug, title, excerpt, category, 
      author_name, author_slug, featured_image, is_featured,
      published_at, updated_at, reading_time
    FROM public.posts
    WHERE status = 'published'
    ORDER BY published_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  return result.map(mapPostFromDb)
}

export async function getPostBySlug(slug: string) {
  const result = await sql`
    SELECT 
      id, slug, title, excerpt, content, category,
      author_name, author_slug, featured_image, is_featured,
      published_at, updated_at, reading_time,
      meta_title, meta_description, image_alt_text,
      source_url, source_name, word_count, related_brokers, tags
    FROM public.posts
    WHERE slug = ${slug} AND status = 'published'
    LIMIT 1
  `
  
  if (result.length === 0) {
    return null
  }
  
  return mapPostFromDb(result[0])
}

export async function getFeaturedPosts(limit = 5) {
  const result = await sql`
    SELECT 
      id, slug, title, excerpt, category,
      author_name, author_slug, featured_image, is_featured,
      published_at, reading_time
    FROM public.posts
    WHERE status = 'published' AND is_featured = true
    ORDER BY published_at DESC
    LIMIT ${limit}
  `
  return result.map(mapPostFromDb)
}

export async function getPostsByCategory(category: string, limit = 10, offset = 0) {
  const result = await sql`
    SELECT 
      id, slug, title, excerpt, category,
      author_name, author_slug, featured_image, is_featured,
      published_at, reading_time
    FROM public.posts
    WHERE status = 'published' AND category = ${category}
    ORDER BY published_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  return result.map(mapPostFromDb)
}

export async function searchPosts(query: string, limit = 20) {
  const searchQuery = `%${query}%`
  const result = await sql`
    SELECT 
      id, slug, title, excerpt, category,
      author_name, author_slug, featured_image,
      published_at, reading_time
    FROM public.posts
    WHERE status = 'published' AND (
      title ILIKE ${searchQuery} OR 
      excerpt ILIKE ${searchQuery} OR 
      content ILIKE ${searchQuery}
    )
    ORDER BY published_at DESC
    LIMIT ${limit}
  `
  return result.map(mapPostFromDb)
}

export async function getRelatedPosts(category: string, currentSlug: string, limit = 3) {
  const result = await sql`
    SELECT 
      id, slug, title, excerpt, category,
      author_name, author_slug, featured_image,
      published_at, reading_time
    FROM public.posts
    WHERE status = 'published' AND category = ${category} AND slug != ${currentSlug}
    ORDER BY published_at DESC
    LIMIT ${limit}
  `
  return result.map(mapPostFromDb)
}

export async function getPostCount() {
  const result = await sql`
    SELECT COUNT(*) as count FROM public.posts WHERE status = 'published'
  `
  return result[0]?.count || 0
}

export async function createPost(post: Partial<Post> & { content: string; author: Author }) {
  const result = await sql`
    INSERT INTO public.posts (
      slug, title, excerpt, content, category,
      author_name, author_slug, featured_image, is_featured
    ) VALUES (
      ${post.slug}, ${post.title}, ${post.excerpt}, ${post.content}, ${post.category},
      ${post.author.name}, ${post.author.slug}, ${post.featuredImage || null}, ${post.isFeatured || false}
    )
    RETURNING id, slug, title, excerpt, category, author_name, author_slug, 
              featured_image, is_featured, published_at, reading_time
  `
  return mapPostFromDb(result[0])
}

export async function updatePost(id: string, updates: Partial<Post> & { content?: string; author?: Author }) {
  const result = await sql`
    UPDATE public.posts
    SET 
      title = COALESCE(${updates.title || null}, title),
      excerpt = COALESCE(${updates.excerpt || null}, excerpt),
      content = COALESCE(${updates.content || null}, content),
      category = COALESCE(${updates.category || null}, category),
      featured_image = COALESCE(${updates.featuredImage || null}, featured_image),
      is_featured = COALESCE(${updates.isFeatured !== undefined ? updates.isFeatured : null}, is_featured),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING id, slug, title, excerpt, category, author_name, author_slug, 
              featured_image, is_featured, published_at, updated_at, reading_time
  `
  return mapPostFromDb(result[0])
}

export async function deletePost(id: string) {
  await sql`DELETE FROM public.posts WHERE id = ${id}`
}

export async function subscribeToNewsletter(email: string) {
  const result = await sql`
    INSERT INTO public.newsletter_subscribers (email)
    VALUES (${email})
    ON CONFLICT (email) DO UPDATE SET subscribed_at = CURRENT_TIMESTAMP
    RETURNING id, email, verified, subscribed_at
  `
  return result[0]
}

export async function getCommentsByPost(postId: string) {
  const result = await sql`
    SELECT id, author_name, author_email, content, created_at
    FROM public.comments
    WHERE post_id = ${postId} AND approved = true
    ORDER BY created_at DESC
  `
  return result
}

export async function createComment(postId: string, authorName: string, authorEmail: string, content: string) {
  const result = await sql`
    INSERT INTO public.comments (post_id, author_name, author_email, content)
    VALUES (${postId}, ${authorName}, ${authorEmail}, ${content})
    RETURNING id, author_name, author_email, content, created_at
  `
  return result[0]
}

// Helper function to map database row to Post type
function mapPostFromDb(row: any): Post & {
  metaTitle?: string
  metaDescription?: string
  imageAltText?: string
  sourceUrl?: string
  sourceName?: string
  wordCount?: number
  relatedBrokers?: string[]
  tags?: string[]
} {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category as any,
    author: {
      name: row.author_name,
      slug: row.author_slug || 'admin',
    },
    featuredImage: row.featured_image,
    isFeatured: row.is_featured,
    publishedAt: row.published_at?.toISOString?.() || row.published_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    readingTime: row.reading_time,
    // SEO and auto-news fields
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    imageAltText: row.image_alt_text,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    wordCount: row.word_count,
    relatedBrokers: row.related_brokers,
    tags: row.tags,
  }
}
