import { notFound, redirect } from 'next/navigation'
import { requireStaff } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { getAdminEditorialAuthor } from '@/lib/admin-editorial'
import { AuthorForm } from '@/components/admin/editorial/author-form'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'

export default async function AdminAuthorEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireStaff('editorial:read')
  if (!roleHasPermission(actor.role, 'editorial:write')) redirect('/admin/authors')
  const { slug } = await params
  const author = await getAdminEditorialAuthor(slug)
  if (!author) notFound()

  return (
    <EditorialWorkspaceFrame active="authors">
      <EditorialPageHeader title={`Edit ${author.name}`} description="Update the public author profile and structured-data fields." />
      <AuthorForm author={author} />
    </EditorialWorkspaceFrame>
  )
}
