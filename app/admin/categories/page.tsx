import Link from 'next/link'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { getAdminCategories, getAdminNewsPosts, getAdminCategoryListHref } from '@/lib/admin-editorial'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Categories · BestForex Admin', robots: { index: false, follow: false } }

export default async function AdminCategoriesPage() {
  const actor = await requireStaffPage('editorial:read')
  const [categories, posts] = await Promise.all([getAdminCategories(), getAdminNewsPosts()])
  const counts = new Map<string, number>()
  for (const post of posts) counts.set(String(post.category), (counts.get(String(post.category)) ?? 0) + 1)
  const canWrite = roleHasPermission(actor.role, 'editorial:write')

  return (
    <EditorialWorkspaceFrame active="categories">
      <EditorialPageHeader
        title="Categories"
        description="Manage the category labels used in editorial records and public news archives. Existing category URLs remain unchanged."
        action={canWrite ? <Button asChild><Link href="/admin/categories/new">Add category</Link></Button> : undefined}
      />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Articles</TableHead><TableHead>Record</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.slug}>
                    <TableCell className="min-w-64">
                      <p className="font-medium">{category.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">/news/category/{category.slug}</p>
                      {category.description ? <p className="mt-2 max-w-xl text-sm text-muted-foreground">{category.description}</p> : null}
                    </TableCell>
                    <TableCell>{counts.get(category.slug) ?? 0}</TableCell>
                    <TableCell><Badge variant="outline">{category.hasDatabaseRecord ? 'Database' : 'Built-in'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline"><Link href={getAdminCategoryListHref(category.slug)}>{canWrite ? 'Edit' : 'View'}</Link></Button>
                        {(counts.get(category.slug) ?? 0) > 0 ? <Button asChild size="sm" variant="ghost"><Link href={`/news/category/${category.slug}`} target="_blank" rel="noreferrer">Public archive</Link></Button> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </EditorialWorkspaceFrame>
  )
}
