import Link from 'next/link'
import { Button } from '@/components/ui/button'

const workspaceLinks = [
  { key: 'overview', href: '/admin/content', label: 'Overview' },
  { key: 'news', href: '/admin/news', label: 'News' },
  { key: 'authors', href: '/admin/authors', label: 'Authors' },
  { key: 'categories', href: '/admin/categories', label: 'Categories' },
  { key: 'sources', href: '/admin/sources', label: 'Sources' },
  { key: 'learning', href: '/admin/learning', label: 'Learn & glossary' },
  { key: 'media', href: '/admin/media', label: 'Media' },
] as const

export type EditorialWorkspaceSection = (typeof workspaceLinks)[number]['key']

export function EditorialWorkspaceNav({
  active,
}: {
  active: EditorialWorkspaceSection
}) {
  return (
    <nav
      aria-label="Editorial workspace"
      className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-2"
    >
      {workspaceLinks.map((item) => (
        <Button
          key={item.key}
          asChild
          size="sm"
          variant={active === item.key ? 'secondary' : 'ghost'}
          aria-current={active === item.key ? 'page' : undefined}
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </nav>
  )
}

export function EditorialPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

export function EditorialWorkspaceFrame({
  active,
  children,
}: {
  active: EditorialWorkspaceSection
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <EditorialWorkspaceNav active={active} />
      {children}
    </div>
  )
}
