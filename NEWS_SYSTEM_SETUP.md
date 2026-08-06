# News System Setup Guide

## Overview
This guide explains how to set up and use the new Neon-powered news system for your forex broker comparison site.

## Prerequisites
- Neon PostgreSQL database connected (✓ Already configured)
- Environment variable `DATABASE_URL` set in your Vercel project

## Database Schema

The system automatically creates the following tables on first API call:

### `posts` table
- id (UUID, Primary Key)
- slug (TEXT, UNIQUE) - URL-friendly identifier
- title (TEXT) - Article title
- excerpt (TEXT) - Short summary
- content (TEXT) - Full article content
- category (TEXT) - news, analysis, education, guide, or review
- author_name (TEXT) - Author name
- author_slug (TEXT) - Author URL identifier
- featured_image (TEXT) - Image URL
- is_featured (BOOLEAN) - Shows on featured section
- status (TEXT) - 'published' or 'draft'
- published_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- created_at (TIMESTAMP)
- reading_time (TEXT) - e.g., "5 min read"

### `categories` table
- id (UUID, Primary Key)
- name (TEXT)
- slug (TEXT, UNIQUE)
- description (TEXT)
- created_at (TIMESTAMP)

### `comments` table
- id (UUID, Primary Key)
- post_id (UUID) - Foreign key to posts
- author_name (TEXT)
- author_email (TEXT)
- content (TEXT)
- approved (BOOLEAN)
- created_at (TIMESTAMP)

### `newsletter_subscribers` table
- id (UUID, Primary Key)
- email (TEXT, UNIQUE)
- verified (BOOLEAN)
- subscribed_at (TIMESTAMP)
- unsubscribed_at (TIMESTAMP)

## API Endpoints

### Get All Posts
```
GET /api/posts?page=1&limit=20
```
Returns paginated list of published posts.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "post-title",
      "title": "Post Title",
      "excerpt": "Short description",
      "category": "news",
      "author": { "name": "Author Name", "slug": "author-slug" },
      "publishedAt": "2026-04-26T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Get Individual Post
```
GET /api/posts/[slug]
```
Returns post with related posts and comments.

### Search Posts
```
GET /api/search?q=trading&limit=20
```
Full-text search across title, excerpt, and content.

### Get Featured Posts
```
GET /api/featured?limit=5
```
Returns featured posts for homepage display.

### Subscribe to Newsletter
```
POST /api/newsletter/subscribe
Content-Type: application/json

{
  "email": "user@example.com"
}
```

## Initialization & Seeding

### Initialize Database Schema
```bash
curl -X POST http://localhost:3000/api/admin/seed
```

This creates all tables with proper indexes and seeds initial posts.

### Manual Database Setup
If needed, manually initialize with:
```typescript
import { initializeDatabase } from '@/lib/db-init'
await initializeDatabase()
```

### Seed Sample Data
```bash
curl -X POST http://localhost:3000/api/admin/seed
```

Creates 5 sample posts across different categories.

## Frontend Usage

### News Listing Page
The `/news` page now:
- Fetches posts from `/api/posts`
- Supports pagination
- Shows loading state while fetching
- Displays error messages if loading fails

### Post Detail Page
The `/news/[slug]` page now:
- Fetches individual post from `/api/posts/[slug]`
- Displays related posts
- Shows comments
- SEO optimized with proper meta tags
- Server-side rendered for best performance

## Creating Posts

### Via Direct Database Query
```typescript
import { createPost } from '@/lib/queries'

await createPost({
  slug: 'my-post',
  title: 'My Post Title',
  excerpt: 'Short summary',
  content: 'Full content here',
  category: 'news',
  author: { name: 'John Doe', slug: 'john-doe' },
  isFeatured: true,
  featuredImage: 'https://example.com/image.jpg'
})
```

### Future: Admin Panel
A full admin dashboard for creating/editing/deleting posts will be implemented at `/admin/posts`.

## Database Queries

### Get Posts by Category
```typescript
import { getPostsByCategory } from '@/lib/queries'
const posts = await getPostsByCategory('analysis', 10, 0)
```

### Search Posts
```typescript
import { searchPosts } from '@/lib/queries'
const results = await searchPosts('trading', 20)
```

### Get Featured Posts
```typescript
import { getFeaturedPosts } from '@/lib/queries'
const featured = await getFeaturedPosts(5)
```

## Performance Optimization

### Indexes Created
- `idx_posts_slug` - Fast lookups by slug
- `idx_posts_category` - Category filtering
- `idx_posts_published_at` - Date sorting
- `idx_posts_is_featured` - Featured post filtering
- `idx_comments_post_id` - Comment retrieval
- `idx_newsletter_email` - Duplicate prevention

### Caching Strategy
- Post listings are cached by Next.js ISR (Incremental Static Regeneration)
- Individual posts are cached with short revalidation time
- Comments are fetched fresh to show latest discussions

## Environment Variables

Make sure these are set in your Vercel project:

```
DATABASE_URL=postgresql://user:password@host/database
```

The connection string is automatically provided when you connect Neon to Vercel.

## Troubleshooting

### Database Connection Errors
1. Verify `DATABASE_URL` is set in environment variables
2. Check Neon project is active and accepting connections
3. Try running the seed endpoint to test connection

### Posts Not Loading
1. Check API endpoint is returning data: `GET /api/posts`
2. Verify database tables exist: `GET /api/admin/seed`
3. Check browser console for error messages
4. Look at server logs for detailed error info

### Performance Issues
1. Check that database indexes are created
2. Verify API response times
3. Consider implementing pagination for large result sets
4. Enable caching for frequently accessed posts

## Next Steps

1. **Create Content**: Add posts via database or future admin panel
2. **Customize Categories**: Expand post categories beyond default ones
3. **Build Admin Dashboard**: Add UI for managing posts
4. **Add Analytics**: Track post views and engagement
5. **Implement Comments**: Enable user comments with moderation
6. **Set Up Newsletter**: Configure email service for subscribers

## Security Notes

- All API endpoints validate input
- Database queries use parameterized statements to prevent SQL injection
- Newsletter emails are rate-limited
- Admin endpoints should be protected with authentication (TODO)

## Support

For issues with the Neon integration:
- Check Neon documentation: https://neon.tech/docs
- Review Next.js API routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
