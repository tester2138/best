import { notFound } from 'next/navigation'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import {
  getAdminCategories,
  getAdminEditorialAuthors,
  getAdminNewsPost,
} from '@/lib/admin-editorial'
import { NewsPostForm } from '@/components/admin/editorial/news-post-form'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'

export default async function AdminNewsEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireStaffPage('editorial:read')
  const canWrite = roleHasPermission(actor.role, 'editorial:write')
  const { slug } = await params
  const [post, categories, authors] = await Promise.all([
    getAdminNewsPost(slug),
    getAdminCategories(),
    getAdminEditorialAuthors(),
  ])
  if (!post) notFound()

  return (
    <EditorialWorkspaceFrame active="news">
      <EditorialPageHeader
        title={canWrite ? 'Edit article' : 'View article'}
        description={canWrite ? 'Changes update the existing article at its current public URL.' : 'Read-only access to this article and its editorial metadata.'}
      />
      <NewsPostForm post={post} categories={categories} authors={authors} readOnly={!canWrite} />
    </EditorialWorkspaceFrame>
  )
}
