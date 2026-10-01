import { requireStaff } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import {
  getAdminEditorialAuthors,
  getAdminEditorialContentEntries,
  getAdminEditorialMedia,
  getAdminNewsPosts,
  getAdminPostListHref,
  getAdminAuthorListHref,
} from '@/lib/admin-editorial'
import { getEditorialContentUrl } from '@/lib/editorial-content'
import { MediaLibrary, type EditorialMediaAsset } from '@/components/admin/editorial/media-library'
import { EditorialPageHeader, EditorialWorkspaceFrame } from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Media · BestForex Admin', robots: { index: false, follow: false } }

export default async function AdminMediaPage() {
  const actor = await requireStaff('editorial:read')
  const [blobs, posts, authors, entries] = await Promise.all([
    getAdminEditorialMedia(),
    getAdminNewsPosts(),
    getAdminEditorialAuthors(),
    getAdminEditorialContentEntries(),
  ])
  const usage = new Map<string, { label: string; href: string }[]>()
  const addUsage = (url: string | undefined, label: string, href: string) => {
    if (!url) return
    const existing = usage.get(url) ?? []
    existing.push({ label, href })
    usage.set(url, existing)
  }

  for (const post of posts) addUsage(post.featuredImage, post.title, getAdminPostListHref(post.slug))
  for (const author of authors) addUsage(author.avatar, `${author.name} (author)`, getAdminAuthorListHref(author.slug))
  for (const entry of entries) {
    const imageUrls = [...entry.content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1])
    for (const url of imageUrls) addUsage(url, `${entry.title} (Learn page)`, getEditorialContentUrl(entry))
  }

  const assets: EditorialMediaAsset[] = blobs.map((blob) => ({
    ...blob,
    usedBy: usage.get(blob.url) ?? [],
  }))
  const canWrite = roleHasPermission(actor.role, 'editorial:write')

  return (
    <EditorialWorkspaceFrame active="media">
      <EditorialPageHeader
        title="Media library"
        description="Browse existing editorial images, see where managed assets are used and upload optimized images for article and author records."
      />
      <MediaLibrary assets={assets} canWrite={canWrite} />
    </EditorialWorkspaceFrame>
  )
}
