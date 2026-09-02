import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mergeVisiblePosts,
  resolveVisiblePost,
  type StoredPostRecord,
} from './news-archive'
import type { Post } from './types'

const now = new Date('2026-09-03T12:00:00.000Z').getTime()

function post(slug: string, publishedAt: string, title = slug): Post {
  return {
    id: `static-${slug}`,
    slug,
    title,
    excerpt: `${title} excerpt`,
    content: `${title} content`,
    category: 'news',
    author: { name: 'Test Author', slug: 'test-author' },
    publishedAt,
    isFeatured: false,
  }
}

function record(value: Post, status = 'published'): StoredPostRecord {
  return { post: value, status }
}

test('supplements a partial database and deduplicates database slugs', () => {
  const canonical = [
    post('september-one', '2026-09-01'),
    post('september-two', '2026-09-02'),
  ]
  const databasePost = post(
    'september-one',
    '2026-09-01',
    'Database title wins',
  )
  databasePost.content = undefined

  const merged = mergeVisiblePosts(
    [record(databasePost), record(databasePost)],
    canonical,
    now,
  )

  assert.deepEqual(
    merged.map((item) => item.slug),
    ['september-two', 'september-one'],
  )
  assert.equal(merged[1].title, 'Database title wins')
  assert.equal(merged[1].content, canonical[0].content)
})

test('database drafts and future rows block the matching static post', () => {
  const canonical = [
    post('draft-story', '2026-09-01'),
    post('scheduled-story', '2026-09-01'),
    post('missing-story', '2026-09-02'),
  ]
  const records = [
    record(post('draft-story', '2026-09-01'), 'draft'),
    record(post('scheduled-story', '2026-09-05')),
  ]

  assert.deepEqual(
    mergeVisiblePosts(records, canonical, now).map((item) => item.slug),
    ['missing-story'],
  )
})

test('single-post lookup falls back only when the database slug is absent', () => {
  const canonical = [post('canonical-story', '2026-09-01')]

  assert.equal(
    resolveVisiblePost('canonical-story', undefined, canonical, now)?.slug,
    'canonical-story',
  )
  assert.equal(
    resolveVisiblePost(
      'canonical-story',
      record(post('canonical-story', '2026-09-01'), 'draft'),
      canonical,
      now,
    ),
    undefined,
  )
})
