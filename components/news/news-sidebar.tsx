import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { AdSlot } from '@/components/ads/ad-slot'
import { getVisiblePosts } from '@/data/posts'

interface NewsSidebarProps {
  /** When provided, excludes the current article so it never links to itself. */
  currentSlug?: string
}

/**
 * Shared right-hand sidebar for the /news listing page and individual article
 * pages, so both stay perfectly coordinated.
 *
 * Layout (top to bottom):
 *   1. Advertising box (full width)
 *   2. Related News  — the 3 most recently published articles, headlines only
 *   3. Advertising box (full width)
 */
export async function NewsSidebar({ currentSlug }: NewsSidebarProps) {
  const recentPosts = (await getVisiblePosts())
    .filter((post) => post.slug !== currentSlug)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 3)

  return (
    <aside className="flex flex-col gap-6">
      {/* Advertising box */}
      <div className="w-full overflow-hidden rounded-xl">
        <AdSlot placementKey="square-1" fluid />
      </div>

      {/* Related News */}
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Related News
        </h2>
        <ol className="flex flex-col">
          {recentPosts.map((post, index) => (
            <li key={post.id}>
              <Link
                href={`/news/${post.slug}`}
                className="group flex gap-3 py-3 first:pt-0 last:pb-0 border-b border-border/60 last:border-b-0"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 text-sm font-bold tabular-nums text-primary"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-3 text-pretty">
                  {post.title}
                </h3>
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      {/* Advertising box */}
      <div className="w-full overflow-hidden rounded-xl">
        <AdSlot placementKey="square-2" fluid />
      </div>
    </aside>
  )
}
