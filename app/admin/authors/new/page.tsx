import { redirect } from 'next/navigation'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { AuthorForm } from '@/components/admin/editorial/author-form'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New author · BestForex Admin', robots: { index: false, follow: false } }

export default async function NewAdminAuthorPage() {
  const actor = await requireStaffPage('editorial:read')
  if (!roleHasPermission(actor.role, 'editorial:write')) redirect('/admin/authors')
  return (
    <EditorialWorkspaceFrame active="authors">
      <EditorialPageHeader title="Add author" description="Create a public editorial profile for future article attribution." />
      <AuthorForm />
    </EditorialWorkspaceFrame>
  )
}
