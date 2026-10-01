import type { ReactNode } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
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
import { hasGlobalStaffScope, requireStaff, type StaffActor } from '@/lib/guards'
import { roleHasPermission, type StaffPermission } from '@/lib/staff-permissions'
import { Err } from '@/lib/portal/result'
import { Toaster } from '@/components/ui/sonner'
import { isAuthSurfaceFlowPath } from '@/lib/portal/auth-routing'
import { cn } from '@/lib/utils'
import '../business/portal-theme.css'
import './admin-theme.css'

export const metadata = {
  title: 'Admin Console · BestForex.io',
  robots: { index: false, follow: false },
}

type NavigationSection = 'Overview' | 'Directory' | 'Operations' | 'Growth' | 'Content studio' | 'Administration'

const SECTION_ORDER: NavigationSection[] = [
  'Overview',
  'Directory',
  'Operations',
  'Growth',
  'Content studio',
  'Administration',
]

type AdminNavItem = {
  href: string
  label: string
  permission: StaffPermission
  section: NavigationSection
  icon: LucideIcon
  allScopeOnly?: boolean
}

const NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', permission: 'dashboard:read', section: 'Overview', icon: LayoutDashboard },
  { href: '/admin/brands', label: 'Brokers', permission: 'brokers:read', section: 'Directory', icon: Building2 },
  { href: '/admin/featured-brokers', label: 'Featured brokers', permission: 'settings:manage', section: 'Directory', icon: Star },
  { href: '/admin/moderation', label: 'Moderation', permission: 'moderation:review', section: 'Operations', icon: ShieldCheck },
  { href: '/admin/leads', label: 'Claim leads', permission: 'leads:read', section: 'Operations', icon: ClipboardCheck },
  { href: '/admin/enquiries', label: 'Merchant requests', permission: 'leads:read', section: 'Operations', icon: Mail, allScopeOnly: true },
  { href: '/admin/offers', label: 'Offers', permission: 'brokers:manage', section: 'Growth', icon: Tag },
  { href: '/admin/advertising', label: 'Advertising', permission: 'brokers:manage', section: 'Growth', icon: Megaphone, allScopeOnly: true },
  { href: '/admin/site-banners', label: 'Site banners', permission: 'brokers:manage', section: 'Growth', icon: PanelTop, allScopeOnly: true },
  { href: '/admin/content', label: 'Editorial', permission: 'editorial:read', section: 'Content studio', icon: BookOpen },
  { href: '/admin/news', label: 'News', permission: 'editorial:read', section: 'Content studio', icon: Newspaper },
  { href: '/admin/authors', label: 'Authors', permission: 'editorial:read', section: 'Content studio', icon: Users },
  { href: '/admin/categories', label: 'Categories', permission: 'editorial:read', section: 'Content studio', icon: FolderOpen },
  { href: '/admin/learning', label: 'Learn & glossary', permission: 'editorial:read', section: 'Content studio', icon: FileText },
  { href: '/admin/sources', label: 'Sources', permission: 'editorial:read', section: 'Content studio', icon: Link2 },
  { href: '/admin/media', label: 'Media library', permission: 'editorial:read', section: 'Content studio', icon: Image },
  { href: '/admin/audit', label: 'Audit log', permission: 'audit:read', section: 'Administration', icon: ClipboardList },
  { href: '/admin/staff', label: 'Staff & access', permission: 'staff:manage', section: 'Administration', icon: Users },
  { href: '/admin/settings', label: 'Settings', permission: 'settings:manage', section: 'Administration', icon: Settings2 },
  { href: '/admin/bulk-import', label: 'Bulk import', permission: 'brokers:manage', section: 'Administration', icon: Upload },
]

function isActiveNavItem(item: AdminNavItem, pathname: string) {
  return pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`))
}

function AdminNavLink({
  item,
  pathname,
  mobile = false,
}: {
  item: AdminNavItem
  pathname: string
  mobile?: boolean
}) {
  const Icon = item.icon
  const active = isActiveNavItem(item, pathname)

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn('admin-nav-link', mobile && 'admin-nav-link-mobile', active && 'is-active')}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers()
  const pathname = requestHeaders.get('x-pathname') ?? requestHeaders.get('next-url') ?? '/admin'

  if (isAuthSurfaceFlowPath('admin', pathname)) {
    return (
      <div className="portal-theme admin-auth-shell min-h-screen bg-background text-foreground">
        {children}
        <Toaster />
      </div>
    )
  }

  let actor: StaffActor
  try {
    actor = await requireStaff('dashboard:read')
  } catch (error) {
    if (error instanceof Err && error.message.startsWith('Staff invitation expired')) {
      redirect('/admin/login?error=invitation-expired')
    }
    if (error instanceof Err && error.message.startsWith('Password change required')) {
      redirect('/admin/set-password')
    }
    if (error instanceof Err && error.message === 'Not signed in') {
      const next = pathname.startsWith('/admin/') ? pathname : '/admin'
      redirect(`/admin/login?next=${encodeURIComponent(next)}`)
    }
    if (error instanceof Err && (error.code === 'forbidden' || error.code === 'not_found')) {
      redirect('/admin/login?error=access-denied')
    }
    throw error
  }

  const globalScope = await hasGlobalStaffScope(actor)
  const visibleNav = NAV.filter(
    (item) =>
      (!item.allScopeOnly || globalScope) &&
      roleHasPermission(actor.role, item.permission),
  )
  const currentPath = pathname.split('?')[0] || '/admin'
  const activeNav = visibleNav.find((item) => isActiveNavItem(item, currentPath))
  const activePageLabel = activeNav?.label ?? 'Workspace'
  const navSections = SECTION_ORDER
    .map((section) => ({
      label: section,
      items: visibleNav.filter((item) => item.section === section),
    }))
    .filter((section) => section.items.length > 0)

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

        <nav aria-label="Admin navigation" className="admin-sidebar-nav">
          {navSections.map((section) => (
            <section key={section.label} className="admin-nav-section">
              <h2 className="admin-nav-section-label">{section.label}</h2>
              <div className="admin-nav-group">
                {section.items.map((item) => (
                  <AdminNavLink key={item.href} item={item} pathname={currentPath} />
                ))}
              </div>
            </section>
          ))}
        </nav>

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
              <details className="admin-mobile-menu">
                <summary className="admin-mobile-menu-trigger">
                  <Menu aria-hidden="true" className="size-4" />
                  <span>Menu</span>
                  <ChevronDown aria-hidden="true" className="admin-mobile-menu-chevron size-4" />
                </summary>
                <div className="admin-mobile-menu-panel">
                  <nav aria-label="Admin navigation" className="admin-mobile-nav">
                    {navSections.map((section) => (
                      <section key={section.label} className="admin-nav-section">
                        <h2 className="admin-nav-section-label">{section.label}</h2>
                        <div className="admin-nav-group">
                          {section.items.map((item) => (
                            <AdminNavLink key={item.href} item={item} pathname={currentPath} mobile />
                          ))}
                        </div>
                      </section>
                    ))}
                  </nav>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main className="admin-content mx-auto w-full max-w-screen-2xl flex-1 px-5 py-7 sm:px-8 sm:py-9 xl:px-10">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}
