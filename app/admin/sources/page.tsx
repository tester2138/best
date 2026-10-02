import Link from 'next/link'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import {
  getAdminSourceDisplayUrl,
  getAdminSourceReferences,
  getAdminPostListHref,
} from '@/lib/admin-editorial'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sources · BestForex Admin', robots: { index: false, follow: false } }

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const actor = await requireStaffPage('editorial:read')
  const params = await searchParams
  const term = (params.q ?? '').trim().slice(0, 120).toLowerCase()
  const references = await getAdminSourceReferences()
  const filtered = references.filter((reference) => !term || [reference.postTitle, reference.label, reference.url].some((value) => value.toLowerCase().includes(term)))
  const canWrite = roleHasPermission(actor.role, 'editorial:write')

  return (
    <EditorialWorkspaceFrame active="sources">
      <EditorialPageHeader
        title="Source register"
        description={`${filtered.length.toLocaleString()} primary and supporting citations linked to the article archive. Source URLs are edited with their article so citations stay attached to the correct record.`}
      />
      <form action="/admin/sources" className="flex flex-col gap-3 sm:flex-row">
        <Input name="q" defaultValue={params.q ?? ''} placeholder="Search source, URL or article" aria-label="Search sources" />
        <Button type="submit" variant="secondary">Search sources</Button>
      </form>
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No source references match this search.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Article</TableHead><TableHead>Kind</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((reference) => (
                    <TableRow key={reference.key}>
                      <TableCell className="min-w-64">
                        <a href={reference.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{reference.label}</a>
                        <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">{getAdminSourceDisplayUrl(reference.url)}</p>
                      </TableCell>
                      <TableCell className="min-w-64">{reference.postTitle}</TableCell>
                      <TableCell><Badge variant="outline">{reference.primary ? 'Primary' : 'Supporting'}</Badge></TableCell>
                      <TableCell className="text-right">
                        {canWrite ? <Button asChild size="sm" variant="outline"><Link href={getAdminPostListHref(reference.postSlug)}>Edit article</Link></Button> : null}
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
