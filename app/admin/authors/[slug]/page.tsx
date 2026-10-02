import { notFound } from 'next/navigation'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { getAdminEditorialAuthor } from '@/lib/admin-editorial'
import { AuthorForm } from '@/components/admin/editorial/author-form'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'

export default async function AdminAuthorEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireStaffPage('editorial:read')
  const canWrite = roleHasPermission(actor.role, 'editorial:write')
  const { slug } = await params
  const author = await getAdminEditorialAuthor(slug)
  if (!author) notFound()

  return (
    <EditorialWorkspaceFrame active="authors">
      <EditorialPageHeader
        title={canWrite ? `Edit ${author.name}` : `View ${author.name}`}
        description={canWrite ? 'Update the public author profile and structured-data fields.' : 'Read-only access to this author profile and its public attribution details.'}
      />
      <AuthorForm author={author} readOnly={!canWrite} />
    </EditorialWorkspaceFrame>
  )
}
