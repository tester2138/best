import { NextRequest, NextResponse } from 'next/server'
import { getPosts, getPostCount } from '@/lib/queries'
import { initializeDatabase } from '@/lib/db-init'
import { sql } from '@/lib/db'
import { requireStaff } from '@/lib/guards'
import { scheduleNewsFeedUpdate } from '@/lib/news-websub'
import { revalidateNewsSurfaces } from '@/lib/news-revalidation'

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    const offset = (page - 1) * limit
    const [posts, total] = await Promise.all([
      getPosts(limit, offset),
      getPostCount(),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff('editorial:write')
    await initializeDatabase()

    const body = await request.json()
    const { title, slug, excerpt, content, category, featured } = body

    if (!title || !slug || !excerpt || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, slug, excerpt, content' },
        { status: 400 }
      )
    }

    const rows = await sql`
      INSERT INTO posts (title, slug, excerpt, content, category, featured, published_at, created_at)
      VALUES (${title}, ${slug}, ${excerpt}, ${content}, ${category || 'General'}, ${featured || false}, NOW(), NOW())
      RETURNING *`

    const post = rows[0]
    revalidateNewsSurfaces(typeof post?.slug === 'string' ? post.slug : undefined)
    scheduleNewsFeedUpdate()
    return NextResponse.json({ data: post }, { status: 201 })
  } catch (error) {
    console.error('[v0] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
