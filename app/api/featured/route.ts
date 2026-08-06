import { NextRequest, NextResponse } from 'next/server'
import { getFeaturedPosts } from '@/lib/queries'
import { initializeDatabase } from '@/lib/db-init'

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase()

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '5'), 20)
    const posts = await getFeaturedPosts(limit)

    return NextResponse.json({
      data: posts,
    })
  } catch (error) {
    console.error('[v0] Featured posts API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch featured posts' },
      { status: 500 }
    )
  }
}
