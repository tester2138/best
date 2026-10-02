import { notFound } from 'next/navigation'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { getAdminCategory } from '@/lib/admin-editorial'
import { CategoryForm } from '@/components/admin/editorial/category-form'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'

export default async function AdminCategoryEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireStaffPage('editorial:read')
  const canWrite = roleHasPermission(actor.role, 'editorial:write')
  const { slug } = await params
  const category = await getAdminCategory(slug)
  if (!category) notFound()

  return (
    <EditorialWorkspaceFrame active="categories">
      <EditorialPageHeader
        title={canWrite ? `Edit ${category.name}` : `View ${category.name}`}
        description={canWrite ? 'Keep the category URL stable while updating its public label and description.' : 'Read-only access to the category label and archive description.'}
      />
      <CategoryForm category={category} readOnly={!canWrite} />
    </EditorialWorkspaceFrame>
  )
}
