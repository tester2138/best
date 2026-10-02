'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Image,
  LayoutDashboard,
  Link2,
  Mail,
  Megaphone,
  Menu,
  Newspaper,
  PanelTop,
  Settings2,
  ShieldCheck,
  Star,
  Tag,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type AdminNavigationSection =
  | 'Overview'
  | 'Directory'
  | 'Operations'
  | 'Growth'
  | 'Content studio'
  | 'Administration'

export type AdminNavigationIcon =
  | 'dashboard'
  | 'brokers'
  | 'featured'
  | 'moderation'
  | 'claims'
  | 'enquiries'
  | 'offers'
  | 'advertising'
  | 'banners'
  | 'editorial'
  | 'news'
  | 'authors'
  | 'categories'
  | 'learning'
  | 'sources'
  | 'media'
  | 'audit'
  | 'staff'
  | 'settings'
  | 'bulkImport'

export type AdminNavigationItem = {
  href: string
  label: string
  section: AdminNavigationSection
  icon: AdminNavigationIcon
}

const SECTION_ORDER: AdminNavigationSection[] = [
  'Overview',
  'Directory',
  'Operations',
  'Growth',
  'Content studio',
  'Administration',
]

const NAV_ICONS: Record<AdminNavigationIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  brokers: Building2,
  featured: Star,
  moderation: ShieldCheck,
  claims: ClipboardCheck,
  enquiries: Mail,
  offers: Tag,
  advertising: Megaphone,
  banners: PanelTop,
  editorial: BookOpen,
  news: Newspaper,
  authors: Users,
  categories: FolderOpen,
  learning: FileText,
  sources: Link2,
  media: Image,
  audit: ClipboardList,
  staff: Users,
  settings: Settings2,
  bulkImport: Upload,
}

function isActiveNavItem(item: AdminNavigationItem, pathname: string) {
  return pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`))
}

function AdminNavLink({
  item,
  pathname,
  mobile = false,
  onNavigate,
}: {
  item: AdminNavigationItem
  pathname: string
  mobile?: boolean
  onNavigate?: () => void
}) {
  const Icon = NAV_ICONS[item.icon]
  const active = isActiveNavItem(item, pathname)

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn('admin-nav-link', mobile && 'admin-nav-link-mobile', active && 'is-active')}
      onClick={onNavigate}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

function AdminNavigationList({
  items,
  pathname,
  mobile = false,
  onNavigate,
}: {
  items: AdminNavigationItem[]
  pathname: string
  mobile?: boolean
  onNavigate?: () => void
}) {
  const navSections = SECTION_ORDER
    .map((section) => ({
      label: section,
      items: items.filter((item) => item.section === section),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <nav
      aria-label="Admin navigation"
      className={mobile ? 'admin-mobile-nav' : 'admin-sidebar-nav'}
    >
      {navSections.map((section) => (
        <section key={section.label} className="admin-nav-section">
          <h2 className="admin-nav-section-label">{section.label}</h2>
          <div className="admin-nav-group">
            {section.items.map((item) => (
              <AdminNavLink
                key={item.href}
                item={item}
                pathname={pathname}
                mobile={mobile}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      ))}
    </nav>
  )
}

export function AdminShell({
  children,
  items,
}: {
  children: ReactNode
  items: AdminNavigationItem[]
}) {
  const pathname = usePathname() ?? '/admin'
  const currentPath = pathname.split('?')[0] || '/admin'
  const activePageLabel = items.find((item) => isActiveNavItem(item, currentPath))?.label ?? 'Workspace'
  const mobileMenuRef = useRef<HTMLDetailsElement>(null)

  function closeMobileMenu() {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false
  }

  useEffect(() => {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false
  }, [currentPath])

  return (
    <div className="admin-app-shell flex min-h-screen bg-background text-foreground">
      <aside className="admin-sidebar hidden shrink-0 flex-col lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 xl:w-72" aria-label="Admin sidebar">
        <div className="admin-sidebar-brand">
          <Link href="/admin" className="admin-brand" aria-label="BestForex Admin dashboard">
            <span className="admin-brand-mark"><LayoutDashboard aria-hidden="true" className="size-5" /></span>
            <span className="admin-brand-copy">
              <span className="admin-brand-name">BestForex</span>
              <span className="admin-brand-caption">ADMIN WORKSPACE</span>
            </span>
          </Link>
        </div>

        <AdminNavigationList items={items} pathname={currentPath} />

        <div className="admin-sidebar-footer">
          <Link href="/business" className="admin-sidebar-business-link">
            <ArrowUpRight aria-hidden="true" className="size-4" />
            <span>Business Portal</span>
          </Link>
        </div>
      </aside>

      <div className="admin-main flex min-w-0 flex-1 flex-col">
        <header className="admin-topbar sticky top-0 z-20">
          <div className="admin-topbar-desktop hidden items-center justify-between gap-6 lg:flex">
            <nav aria-label="Admin breadcrumb" className="admin-page-context">
              <span className="admin-page-context-root">Workspace</span>
              <ChevronRight aria-hidden="true" className="size-4" />
              <span aria-current="page"><strong>{activePageLabel}</strong></span>
            </nav>
            <Link href="/business" className="admin-topbar-business-link">
              <span>Open Business Portal</span>
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="admin-topbar-mobile lg:hidden">
            <div className="admin-mobile-brand-row">
              <Link href="/admin" className="admin-mobile-brand" aria-label="BestForex Admin dashboard">
                <span className="admin-brand-mark"><LayoutDashboard aria-hidden="true" className="size-5" /></span>
                <span className="admin-brand-name">BestForex <span className="admin-mobile-brand-suffix">Admin</span></span>
              </Link>
              <Link href="/business" className="admin-mobile-portal-link">
                <span>Portal</span>
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <div className="admin-mobile-context-row">
              <nav aria-label="Admin breadcrumb" className="admin-page-context">
                <span className="admin-page-context-root">Workspace</span>
                <ChevronRight aria-hidden="true" className="size-4" />
                <span aria-current="page"><strong>{activePageLabel}</strong></span>
              </nav>
              <details className="admin-mobile-menu" ref={mobileMenuRef}>
                <summary className="admin-mobile-menu-trigger">
                  <Menu aria-hidden="true" className="size-4" />
                  <span>Menu</span>
                  <ChevronDown aria-hidden="true" className="admin-mobile-menu-chevron size-4" />
                </summary>
                <div className="admin-mobile-menu-panel">
                  <AdminNavigationList
                    items={items}
                    pathname={currentPath}
                    mobile
                    onNavigate={closeMobileMenu}
                  />
                </div>
              </details>
            </div>
          </div>
        </header>

        <main className="admin-content mx-auto w-full max-w-screen-2xl flex-1 px-5 py-7 sm:px-8 sm:py-9 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}
