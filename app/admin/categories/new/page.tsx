import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { CategoryForm } from '@/components/admin/editorial/category-form'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New category · BestForex Admin', robots: { index: false, follow: false } }

export default async function NewAdminCategoryPage() {
  const actor = await requireStaff('editorial:read')
  if (!roleHasPermission(actor.role, 'editorial:write')) redirect('/admin/categories')
  return (
    <EditorialWorkspaceFrame active="categories">
      <EditorialPageHeader title="Add category" description="Create a reusable editorial label for news and analysis." />
      <CategoryForm />
    </EditorialWorkspaceFrame>
  )
}
