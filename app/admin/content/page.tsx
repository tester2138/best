import Link from 'next/link'
import { ArrowRight, BookOpen, FileText, FolderOpen, Image, Link2, Users } from 'lucide-react'
import { requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import {
  getAdminCategories,
  getAdminEditorialAuthors,
  getAdminEditorialContentEntries,
  getAdminNewsPosts,
} from '@/lib/admin-editorial'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  EditorialPageHeader,
  EditorialWorkspaceFrame,
} from '@/components/admin/editorial/workspace-nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Editorial · BestForex Admin', robots: { index: false, follow: false } }

export default async function EditorialWorkspacePage() {
  const actor = await requireStaffPage('editorial:read')
  const [posts, authors, categories, learningContent] = await Promise.all([
    getAdminNewsPosts(),
    getAdminEditorialAuthors(),
    getAdminCategories(),
    getAdminEditorialContentEntries(),
  ])
  const sourceCount = posts.reduce(
    (count, post) => count + (post.sourceUrl ? 1 : 0) + (post.linkedSources?.length ?? 0),
    0,
  )
  const canWrite = roleHasPermission(actor.role, 'editorial:write')
  const sections = [
    { key: 'news', title: 'News articles', description: 'Edit stories, schedules, sources, images and SEO metadata.', count: posts.length, href: '/admin/news', icon: FileText },
    { key: 'authors', title: 'Authors', description: 'Maintain the author bios and public profile information.', count: authors.length, href: '/admin/authors', icon: Users },
    { key: 'categories', title: 'Categories', description: 'Manage editorial labels used by news articles and archives.', count: categories.length, href: '/admin/categories', icon: FolderOpen },
    { key: 'learning', title: 'Learn & glossary', description: 'Publish education pages, glossary entries and corrections policy.', count: learningContent.length, href: '/admin/learning', icon: BookOpen },
    { key: 'sources', title: 'Sources', description: 'Review every primary and supporting citation attached to an article.', count: sourceCount, href: '/admin/sources', icon: Link2 },
    { key: 'media', title: 'Media library', description: 'Browse existing editorial images and upload optimized assets.', count: null, href: '/admin/media', icon: Image },
  ] as const

  return (
    <EditorialWorkspaceFrame active="overview">
      <EditorialPageHeader
        title="Editorial workspace"
        description="A single control room for the public news archive, author profiles, learning pages and supporting assets. Changes publish to the existing BestForex.io URLs."
        action={canWrite ? (
          <Button asChild>
            <Link href="/admin/news/new">Create article</Link>
          </Button>
        ) : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.key} className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted text-foreground">
                    <Icon aria-hidden="true" />
                  </div>
                  {section.count !== null ? <Badge variant="secondary">{section.count.toLocaleString()}</Badge> : null}
                </div>
                <CardTitle className="pt-2">{section.title}</CardTitle>
                <CardDescription className="leading-relaxed">{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href={section.href}>
                    Open section <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </EditorialWorkspaceFrame>
  )
}
