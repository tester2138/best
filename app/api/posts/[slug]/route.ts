import { NextRequest, NextResponse } from 'next/server'
import { getPostBySlug, getRelatedPosts, getCommentsByPost } from '@/lib/queries'
import { initializeDatabase } from '@/lib/db-init'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await initializeDatabase()

    const { slug } = await params
    const post = await getPostBySlug(slug)

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const [relatedPosts, comments] = await Promise.all([
      getRelatedPosts(post.id, post.category, 3),
      getCommentsByPost(post.id),
    ])

    return NextResponse.json({
      data: {
        ...post,
        related: relatedPosts,
        comments,
      },
    })
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}
