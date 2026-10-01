import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireStaff } from '@/lib/guards'
import { scheduleNewsFeedUpdate } from '@/lib/news-websub'
import { revalidateNewsSurfaces } from '@/lib/news-revalidation'

export async function POST(request: NextRequest) {
  try {
    await requireStaff('editorial:write')

    const body = await request.json()
    const { title, slug, excerpt, content, category } = body
    if (
      typeof title !== 'string' ||
      typeof slug !== 'string' ||
      typeof excerpt !== 'string' ||
      typeof content !== 'string' ||
      !title.trim() ||
      !slug.trim() ||
      !excerpt.trim() ||
      !content.trim()
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO public.posts (title, slug, excerpt, content, category, published_at, created_at)
      VALUES (${title.trim()}, ${slug.trim()}, ${excerpt.trim()}, ${content}, ${category || 'General'}, NOW(), NOW())
      RETURNING id, slug, title, published_at
    `
    const post = rows[0]

    revalidateNewsSurfaces(typeof post?.slug === 'string' ? post.slug : undefined)
    scheduleNewsFeedUpdate()
    return NextResponse.json({ data: post }, { status: 201 })
  } catch (error) {
    console.error('[v0] Create post error:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
