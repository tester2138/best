import type { Post } from './types'

export type StoredPostRecord = {
  post: Post
  status: string | null
}

export function isPostLive(post: Post, now = Date.now()): boolean {
  const publishedAt = new Date(post.publishedAt).getTime()
  return Number.isNaN(publishedAt) || publishedAt <= now
}

function mergePost(dbPost: Post, staticPost?: Post): Post {
  if (!staticPost) return dbPost

  return {
    ...staticPost,
    ...dbPost,
    content: dbPost.content ?? staticPost.content,
    sourceName: dbPost.sourceName ?? staticPost.sourceName,
    editorNote: dbPost.editorNote ?? staticPost.editorNote,
  }
}

/**
 * Merge the database inventory with the in-repo canonical archive.
 *
 * A database row is authoritative when its slug exists, including when that row
 * is a draft or scheduled for the future. Static posts only fill genuine holes
 * in a partial database, which prevents an incomplete successful query from
 * making canonical articles disappear without bypassing editorial visibility.
 */
export function mergeVisiblePosts(
  databaseRecords: StoredPostRecord[],
  staticPosts: Post[],
  now = Date.now(),
): Post[] {
  const staticBySlug = new Map(staticPosts.map((post) => [post.slug, post]))
  const databaseSlugs = new Set<string>()
  const visibleBySlug = new Map<string, Post>()

  for (const record of databaseRecords) {
    databaseSlugs.add(record.post.slug)
    if (record.status !== 'published' || !isPostLive(record.post, now)) continue

    visibleBySlug.set(
      record.post.slug,
      mergePost(record.post, staticBySlug.get(record.post.slug)),
    )
  }

  for (const post of staticPosts) {
    if (databaseSlugs.has(post.slug) || !isPostLive(post, now)) continue
    visibleBySlug.set(post.slug, post)
  }

  return [...visibleBySlug.values()].sort((a, b) => {
    const dateDifference =
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    return dateDifference || a.slug.localeCompare(b.slug)
  })
}

export function resolveVisiblePost(
  slug: string,
  databaseRecord: StoredPostRecord | undefined,
  staticPosts: Post[],
  now = Date.now(),
): Post | undefined {
  const staticPost = staticPosts.find((post) => post.slug === slug)

  if (databaseRecord) {
    if (
      databaseRecord.status !== 'published' ||
      !isPostLive(databaseRecord.post, now)
    ) {
      return undefined
    }
    return mergePost(databaseRecord.post, staticPost)
  }

  return staticPost && isPostLive(staticPost, now) ? staticPost : undefined
}
