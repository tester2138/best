import { notFound, redirect } from 'next/navigation'
import { requireStaff } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import {
  getAdminEditorialContentEntry,
  getEditorialContentForAdminKind,
} from '@/lib/admin-editorial'
import { editorialContentKindLabel } from '@/lib/editorial-content'
import { EditorialContentForm } from '@/components/admin/editorial/content-form'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'

export default async function AdminEditorialContentEditorPage({
  params,
}: {
  params: Promise<{ kind: string; slug: string }>
}) {
  const actor = await requireStaff('editorial:read')
  if (!roleHasPermission(actor.role, 'editorial:write')) redirect('/admin/learning')
  const { kind: kindValue, slug } = await params
  const kind = getEditorialContentForAdminKind(kindValue)
  if (!kind) notFound()
  const isNew = slug === 'new'
  if (kind === 'corrections_policy' && isNew) notFound()
  const entry = isNew ? undefined : await getAdminEditorialContentEntry(kind, slug)
  if (!isNew && !entry) notFound()

  return (
    <EditorialWorkspaceFrame active="learning">
      <EditorialPageHeader
        title={isNew ? `Add ${editorialContentKindLabel(kind).toLowerCase()}` : `Edit ${entry!.title}`}
        description="Update editorial content, visibility and search metadata. The published route stays at its current slug."
      />
      <EditorialContentForm kind={kind} entry={entry} />
    </EditorialWorkspaceFrame>
  )
}
