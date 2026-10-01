import { notFound, redirect } from 'next/navigation'
import { requireStaff } from '@/lib/guards'
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
  const actor = await requireStaff('editorial:read')
  if (!roleHasPermission(actor.role, 'editorial:write')) redirect('/admin/news')
  const { slug } = await params
  const [post, categories, authors] = await Promise.all([
    getAdminNewsPost(slug),
    getAdminCategories(),
    getAdminEditorialAuthors(),
  ])
  if (!post) notFound()

  return (
    <EditorialWorkspaceFrame active="news">
      <EditorialPageHeader title="Edit article" description="Changes update the existing article at its current public URL." />
      <NewsPostForm post={post} categories={categories} authors={authors} />
    </EditorialWorkspaceFrame>
  )
}
