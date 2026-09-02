import {
  getFeaturedPosts as getVisibleFeaturedPosts,
  getPostBySlug as getVisiblePostBySlug,
  getPostsByCategory as getVisiblePostsByCategory,
  getVisiblePosts,
} from './news-queries'
import { sql } from './db'
import type { Author, Post } from './types'

export async function getPosts(limit = 20, offset = 0) {
  const posts = await getVisiblePosts()
  return posts.slice(Math.max(0, offset), Math.max(0, offset) + Math.max(0, limit))
}

export async function getPostBySlug(slug: string) {
  return (await getVisiblePostBySlug(slug)) ?? null
}

export async function getFeaturedPosts(limit = 5) {
  return (await getVisibleFeaturedPosts()).slice(0, Math.max(0, limit))
}

export async function getPostsByCategory(category: string, limit = 10, offset = 0) {
  const posts = await getVisiblePostsByCategory(category)
  return posts.slice(Math.max(0, offset), Math.max(0, offset) + Math.max(0, limit))
}

export async function searchPosts(query: string, limit = 20) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []

  return (await getVisiblePosts())
    .filter(
      (post) =>
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.excerpt.toLowerCase().includes(normalizedQuery) ||
        post.content?.toLowerCase().includes(normalizedQuery) ||
        post.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery)),
    )
    .slice(0, Math.max(0, limit))
}

export async function getRelatedPosts(
  category: string,
  currentSlug: string,
  limit = 3,
) {
  return (await getVisiblePostsByCategory(category))
    .filter((post) => post.slug !== currentSlug)
    .slice(0, Math.max(0, limit))
}

export async function getPostCount() {
  return (await getVisiblePosts()).length
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

export async function updatePost(
  id: string,
  updates: Partial<Post> & { content?: string; author?: Author },
) {
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
  return sql`
    SELECT id, author_name, author_email, content, created_at
    FROM public.comments
    WHERE post_id = ${postId} AND approved = true
    ORDER BY created_at DESC
  `
}

export async function createComment(
  postId: string,
  authorName: string,
  authorEmail: string,
  content: string,
) {
  const result = await sql`
    INSERT INTO public.comments (post_id, author_name, author_email, content)
    VALUES (${postId}, ${authorName}, ${authorEmail}, ${content})
    RETURNING id, author_name, author_email, content, created_at
  `
  return result[0]
}

function mapPostFromDb(row: Record<string, any>): Post {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    author: {
      name: row.author_name,
      slug: row.author_slug || 'admin',
    },
    featuredImage: row.featured_image,
    isFeatured: row.is_featured,
    publishedAt: row.published_at?.toISOString?.() || row.published_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    readingTime: row.reading_time,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    imageAltText: row.image_alt_text,
    sourceName: row.source_name,
    wordCount: row.word_count,
    relatedBrokers: row.related_brokers,
    tags: row.tags,
  }
}
