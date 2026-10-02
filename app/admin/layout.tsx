import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { hasGlobalStaffScope, requireStaff, type StaffActor } from '@/lib/guards'
import { roleHasPermission, type StaffPermission } from '@/lib/staff-permissions'
import { Err } from '@/lib/portal/result'
import { Toaster } from '@/components/ui/sonner'
import { AdminShell, type AdminNavigationItem } from '@/components/admin/admin-shell'
import { isAuthSurfaceFlowPath } from '@/lib/portal/auth-routing'
import '../business/portal-theme.css'
import './admin-theme.css'

export const metadata = {
  title: 'Admin Console · BestForex.io',
  robots: { index: false, follow: false },
}

type AdminNavItem = AdminNavigationItem & {
  permission: StaffPermission
  allScopeOnly?: boolean
}

const NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', permission: 'dashboard:read', section: 'Overview', icon: 'dashboard' },
  { href: '/admin/brands', label: 'Brokers', permission: 'brokers:read', section: 'Directory', icon: 'brokers' },
  { href: '/admin/featured-brokers', label: 'Featured brokers', permission: 'settings:manage', section: 'Directory', icon: 'featured' },
  { href: '/admin/moderation', label: 'Moderation', permission: 'moderation:review', section: 'Operations', icon: 'moderation' },
  { href: '/admin/leads', label: 'Claim leads', permission: 'leads:read', section: 'Operations', icon: 'claims' },
  { href: '/admin/enquiries', label: 'Merchant requests', permission: 'leads:read', section: 'Operations', icon: 'enquiries', allScopeOnly: true },
  { href: '/admin/offers', label: 'Offers', permission: 'brokers:manage', section: 'Growth', icon: 'offers' },
  { href: '/admin/advertising', label: 'Advertising', permission: 'brokers:manage', section: 'Growth', icon: 'advertising', allScopeOnly: true },
  { href: '/admin/site-banners', label: 'Site banners', permission: 'brokers:manage', section: 'Growth', icon: 'banners', allScopeOnly: true },
  { href: '/admin/content', label: 'Editorial', permission: 'editorial:read', section: 'Content studio', icon: 'editorial' },
  { href: '/admin/news', label: 'News', permission: 'editorial:read', section: 'Content studio', icon: 'news' },
  { href: '/admin/authors', label: 'Authors', permission: 'editorial:read', section: 'Content studio', icon: 'authors' },
  { href: '/admin/categories', label: 'Categories', permission: 'editorial:read', section: 'Content studio', icon: 'categories' },
  { href: '/admin/learning', label: 'Learn & glossary', permission: 'editorial:read', section: 'Content studio', icon: 'learning' },
  { href: '/admin/sources', label: 'Sources', permission: 'editorial:read', section: 'Content studio', icon: 'sources' },
  { href: '/admin/media', label: 'Media library', permission: 'editorial:read', section: 'Content studio', icon: 'media' },
  { href: '/admin/audit', label: 'Audit log', permission: 'audit:read', section: 'Administration', icon: 'audit' },
  { href: '/admin/staff', label: 'Staff & access', permission: 'staff:manage', section: 'Administration', icon: 'staff' },
  { href: '/admin/settings', label: 'Settings', permission: 'settings:manage', section: 'Administration', icon: 'settings' },
  { href: '/admin/bulk-import', label: 'Bulk import', permission: 'brokers:manage', section: 'Administration', icon: 'bulkImport' },
]

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
  return (
    <>
      <AdminShell
        items={visibleNav.map(({ href, label, section, icon }) => ({
          href,
          label,
          section,
          icon,
        }))}
      >
        {children}
      </AdminShell>
      <Toaster />
    </>
  )
}
