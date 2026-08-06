import { sql } from './db'

export async function initializeDatabase() {
  try {
    // Create categories table
    await sql`
      CREATE TABLE IF NOT EXISTS public.categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create posts table
    await sql`
      CREATE TABLE IF NOT EXISTS public.posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'news',
        author_name TEXT NOT NULL DEFAULT 'Admin',
        author_slug TEXT DEFAULT 'admin',
        featured_image TEXT,
        is_featured BOOLEAN DEFAULT false,
        status TEXT DEFAULT 'published',
        published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        reading_time TEXT
      )
    `

    // Create comments table
    await sql`
      CREATE TABLE IF NOT EXISTS public.comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
        author_name TEXT NOT NULL,
        author_email TEXT NOT NULL,
        content TEXT NOT NULL,
        approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create newsletter subscribers table
    await sql`
      CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        verified BOOLEAN DEFAULT false,
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        unsubscribed_at TIMESTAMP WITH TIME ZONE
      )
    `

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug)`
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category)`
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_is_featured ON public.posts(is_featured)`
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(email)`

    console.log('[v0] Database schema initialized successfully')
    return true
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('[v0] Database schema already exists')
      return true
    }
    console.error('[v0] Database initialization error:', error)
    return false
  }
}
