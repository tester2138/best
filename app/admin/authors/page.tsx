import Link from 'next/link'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { getAdminEditorialAuthors, getAdminNewsPosts, getAdminAuthorListHref } from '@/lib/admin-editorial'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Authors · BestForex Admin', robots: { index: false, follow: false } }

export default async function AdminAuthorsPage() {
  const actor = await requireStaffPage('editorial:read')
  const [authors, posts] = await Promise.all([getAdminEditorialAuthors(), getAdminNewsPosts()])
  const counts = new Map<string, number>()
  for (const post of posts) counts.set(post.author.slug, (counts.get(post.author.slug) ?? 0) + 1)
  const canWrite = roleHasPermission(actor.role, 'editorial:write')

  return (
    <EditorialWorkspaceFrame active="authors">
      <EditorialPageHeader
        title="Authors"
        description={`${authors.length.toLocaleString()} public author profiles. Existing attribution stays available even when an author is no longer selectable for new articles.`}
        action={canWrite ? <Button asChild><Link href="/admin/authors/new">Add author</Link></Button> : undefined}
      />
      <Card>
        <CardContent className="p-0">
          {authors.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No author profiles are available.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Author</TableHead><TableHead>Status</TableHead><TableHead>Articles</TableHead><TableHead>Profile source</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {authors.map((author) => (
                    <TableRow key={author.slug}>
                      <TableCell className="min-w-64">
                        <p className="font-medium">{author.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{author.role || 'No role set'} · /news/author/{author.slug}</p>
                      </TableCell>
                      <TableCell><Badge variant={author.isActive ? 'secondary' : 'outline'}>{author.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>{counts.get(author.slug) ?? 0}</TableCell>
                      <TableCell><Badge variant="outline">{author.isOverridden ? 'Database override' : 'Static profile'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline"><Link href={getAdminAuthorListHref(author.slug)}>{canWrite ? 'Edit' : 'View'}</Link></Button>
                          {counts.has(author.slug) ? <Button asChild size="sm" variant="ghost"><Link href={`/news/author/${author.slug}`} target="_blank" rel="noreferrer">Public page</Link></Button> : null}
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
    </EditorialWorkspaceFrame>
  )
}
