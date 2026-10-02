import Link from 'next/link'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import {
  getAdminContentListHref,
  getAdminEditorialContentEntries,
} from '@/lib/admin-editorial'
import {
  editorialContentKindLabel,
  editorialContentStatusLabel,
  getEditorialContentUrl,
  type EditorialContentKind,
} from '@/lib/editorial-content'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Learn & glossary · BestForex Admin', robots: { index: false, follow: false } }

const kinds: EditorialContentKind[] = ['learn_page', 'glossary_term', 'corrections_policy']

export default async function AdminLearningPage() {
  const actor = await requireStaffPage('editorial:read')
  const entries = await getAdminEditorialContentEntries()
  const canWrite = roleHasPermission(actor.role, 'editorial:write')
  const sections = kinds.map((kind) => ({
    kind,
    label: editorialContentKindLabel(kind),
    entries: entries.filter((entry) => entry.kind === kind),
  }))

  return (
    <EditorialWorkspaceFrame active="learning">
      <EditorialPageHeader
        title="Learn & glossary"
        description="Manage public education pages, glossary entries and the corrections policy. Published content keeps its current URL and is sanitized before rendering."
      />
      {sections.map((section) => (
        <Card key={section.kind}>
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">{section.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{section.entries.length} entries</p>
            </div>
            {canWrite && section.kind !== 'corrections_policy' ? (
              <div className="flex flex-wrap gap-2">
                {section.kind === 'learn_page' ? (
                  <Button asChild size="sm" variant="outline"><Link href="/admin/learning/learn_page/new">Add Learn page</Link></Button>
                ) : (
                  <Button asChild size="sm" variant="outline"><Link href="/admin/learning/glossary_term/new">Add glossary entry</Link></Button>
                )}
              </div>
            ) : null}
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Public URL</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {section.entries.map((entry) => (
                    <TableRow key={`${entry.kind}:${entry.slug}`}>
                      <TableCell className="min-w-56">
                        <p className="font-medium">{entry.title}</p>
                        {entry.summary ? <p className="mt-1 max-w-xl text-sm text-muted-foreground">{entry.summary}</p> : null}
                      </TableCell>
                      <TableCell><Badge variant={entry.status === 'published' ? 'secondary' : 'outline'}>{editorialContentStatusLabel(entry.status)}</Badge></TableCell>
                      <TableCell className="max-w-72 truncate text-sm text-muted-foreground">{getEditorialContentUrl(entry)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canWrite ? <Button asChild size="sm" variant="outline"><Link href={getAdminContentListHref(entry.kind, entry.slug)}>Edit</Link></Button> : null}
                          {entry.status === 'published' ? <Button asChild size="sm" variant="ghost"><Link href={getEditorialContentUrl(entry)} target="_blank" rel="noreferrer">Public page</Link></Button> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {section.entries.length === 0 ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No entries yet.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </EditorialWorkspaceFrame>
  )
}
