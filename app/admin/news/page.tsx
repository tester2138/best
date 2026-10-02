import Link from 'next/link'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import {
  getAdminNewsPosts,
  getAdminPostListHref,
  getAdminPostStatusLabel,
  safeAdminPageNumber,
} from '@/lib/admin-editorial'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  EditorialPageHeader,
  EditorialWorkspaceFrame,
} from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'News · BestForex Admin', robots: { index: false, follow: false } }

const PAGE_SIZE = 30

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not scheduled'
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
}

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const actor = await requireStaffPage('editorial:read')
  const params = await searchParams
  const term = (params.q ?? '').trim().slice(0, 100)
  const status = ['draft', 'published', 'scheduled'].includes(params.status ?? '') ? params.status : ''
  const page = safeAdminPageNumber(params.page)
  const posts = await getAdminNewsPosts()
  const query = term.toLowerCase()
  const filteredPosts = posts.filter((post) => {
    const matchesSearch = !query || [post.title, post.slug, post.author.name, post.category]
      .some((value) => value.toLowerCase().includes(query))
    return matchesSearch && (!status || post.status === status)
  })
  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagePosts = filteredPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const canWrite = roleHasPermission(actor.role, 'editorial:write')

  function pageHref(nextPage: number): string {
    const search = new URLSearchParams()
    if (term) search.set('q', term)
    if (status) search.set('status', status)
    if (nextPage > 1) search.set('page', String(nextPage))
    const suffix = search.toString()
    return suffix ? `/admin/news?${suffix}` : '/admin/news'
  }

  return (
    <EditorialWorkspaceFrame active="news">
      <EditorialPageHeader
        title="News articles"
        description={`${filteredPosts.length.toLocaleString()} matching editorial records, including the static archive and database-backed drafts.`}
        action={canWrite ? (
          <Button asChild>
            <Link href="/admin/news/new">Create article</Link>
          </Button>
        ) : undefined}
      />

      <form action="/admin/news" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row">
        <Input name="q" defaultValue={term} placeholder="Search title, URL, author or category" aria-label="Search articles" />
        <label className="sr-only" htmlFor="article-status">Filter by status</label>
        <select
          id="article-status"
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {pagePosts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No articles match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Publish date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagePosts.map((post) => (
                    <TableRow key={post.slug}>
                      <TableCell className="min-w-72">
                        <p className="max-w-xl font-medium text-foreground">{post.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">/news/{post.slug} · {post.category}{post.isFeatured ? ' · Featured' : ''}</p>
                      </TableCell>
                      <TableCell>{post.author.name}</TableCell>
                      <TableCell>
                        <Badge variant={post.status === 'published' ? 'secondary' : 'outline'}>
                          {getAdminPostStatusLabel(post.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(post.publishedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canWrite ? (
                            <Button asChild variant="outline" size="sm">
                              <Link href={getAdminPostListHref(post.slug)}>Edit</Link>
                            </Button>
                          ) : null}
                          {post.status === 'published' ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/news/${post.slug}`} target="_blank" rel="noreferrer">Public page</Link>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>Page {currentPage} of {pageCount}</span>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" disabled={currentPage <= 1}>
            <Link aria-disabled={currentPage <= 1} href={pageHref(Math.max(1, currentPage - 1))}>Previous</Link>
          </Button>
          <Button asChild size="sm" variant="outline" disabled={currentPage >= pageCount}>
            <Link aria-disabled={currentPage >= pageCount} href={pageHref(Math.min(pageCount, currentPage + 1))}>Next</Link>
          </Button>
        </div>
      </div>
    </EditorialWorkspaceFrame>
  )
}
