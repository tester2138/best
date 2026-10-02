import { redirect } from 'next/navigation'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { getAdminCategories, getAdminEditorialAuthors } from '@/lib/admin-editorial'
import { NewsPostForm } from '@/components/admin/editorial/news-post-form'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New article · BestForex Admin', robots: { index: false, follow: false } }

export default async function NewAdminNewsPage() {
  const actor = await requireStaffPage('editorial:read')
  if (!roleHasPermission(actor.role, 'editorial:write')) redirect('/admin/news')
  const [categories, authors] = await Promise.all([getAdminCategories(), getAdminEditorialAuthors()])

  return (
    <EditorialWorkspaceFrame active="news">
      <EditorialPageHeader title="Create article" description="Add a news article while preserving the existing publication and attribution rules." />
      <NewsPostForm categories={categories} authors={authors} />
    </EditorialWorkspaceFrame>
  )
}
