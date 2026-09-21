import { NextRequest, NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'
import { scheduleNewsFeedUpdate } from '@/lib/news-websub'
import { revalidateNewsSurfaces } from '@/lib/news-revalidation'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      )
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL })

    const body = await request.json()
    const { title, slug, excerpt, content, category, featured } = body

    if (!title || !slug || !excerpt || !content) {
      await pool.end()
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO posts (title, slug, excerpt, content, category, published_at, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [title, slug, excerpt, content, category || 'General']
      )

      const post = result.rows[0]
      revalidateNewsSurfaces(typeof post?.slug === 'string' ? post.slug : undefined)
      scheduleNewsFeedUpdate()
      return NextResponse.json({ data: post }, { status: 201 })
    } finally {
      await client.release()
      await pool.end()
    }
  } catch (error) {
    console.error('[v0] Create post error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create post' },
      { status: 500 }
    )
  }
}
