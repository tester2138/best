import { NextRequest, NextResponse } from 'next/server'
import { searchPosts } from '@/lib/queries'
import { initializeDatabase } from '@/lib/db-init'

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase()

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const results = await searchPosts(query, limit)

    return NextResponse.json({
      data: results,
      query,
      count: results.length,
    })
  } catch (error) {
    console.error('[v0] Search API error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
