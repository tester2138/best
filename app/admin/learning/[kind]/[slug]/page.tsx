import { notFound, redirect } from 'next/navigation'
import { requireStaffPage } from '@/lib/guards'
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
  const actor = await requireStaffPage('editorial:read')
  const { kind: kindValue, slug } = await params
  const kind = getEditorialContentForAdminKind(kindValue)
  if (!kind) notFound()
  const canWrite = roleHasPermission(actor.role, 'editorial:write')
  const isNew = slug === 'new'
  if (!canWrite && isNew) redirect('/admin/learning')
  if (kind === 'corrections_policy' && isNew) notFound()
  const entry = isNew ? undefined : await getAdminEditorialContentEntry(kind, slug)
  if (!isNew && !entry) notFound()

  return (
    <EditorialWorkspaceFrame active="learning">
      <EditorialPageHeader
        title={isNew ? `Add ${editorialContentKindLabel(kind).toLowerCase()}` : canWrite ? `Edit ${entry!.title}` : `View ${entry!.title}`}
        description={canWrite ? 'Update editorial content, visibility and search metadata. The published route stays at its current slug.' : 'Read-only access to this editorial content and its search metadata.'}
      />
      <EditorialContentForm kind={kind} entry={entry} readOnly={!canWrite} />
    </EditorialWorkspaceFrame>
  )
}
