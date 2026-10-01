import type { ReactNode } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { hasGlobalStaffScope, requireStaff, type StaffActor } from '@/lib/guards'
import { roleHasPermission, type StaffPermission } from '@/lib/staff-permissions'
import { Err } from '@/lib/portal/result'
import { Toaster } from '@/components/ui/sonner'
import { isAuthSurfaceFlowPath } from '@/lib/portal/auth-routing'
import '../business/portal-theme.css'

export const metadata = {
  title: 'Admin · BestForex Portal',
  robots: { index: false, follow: false },
}

const NAV: Array<{
  href: string
  label: string
  permission: StaffPermission
  allScopeOnly?: boolean
}> = [
  { href: '/admin', label: 'Dashboard', permission: 'dashboard:read' },
  { href: '/admin/brands', label: 'Brokers', permission: 'brokers:read' },
  { href: '/admin/featured-brokers', label: 'Featured brokers', permission: 'settings:manage' },
  { href: '/admin/moderation', label: 'Moderation', permission: 'moderation:review' },
  { href: '/admin/leads', label: 'Claim leads', permission: 'leads:read' },
  { href: '/admin/enquiries', label: 'Merchant requests', permission: 'leads:read', allScopeOnly: true },
  { href: '/admin/advertising', label: 'Advertising', permission: 'brokers:manage', allScopeOnly: true },
  { href: '/admin/offers', label: 'Offers', permission: 'brokers:manage' },
  { href: '/admin/content', label: 'Editorial', permission: 'editorial:read' },
  { href: '/admin/news', label: 'News', permission: 'editorial:read' },
  { href: '/admin/audit', label: 'Audit log', permission: 'audit:read' },
  { href: '/admin/staff', label: 'Staff & access', permission: 'staff:manage' },
  { href: '/admin/settings', label: 'Settings', permission: 'settings:manage' },
  { href: '/admin/bulk-import', label: 'Bulk import', permission: 'brokers:manage' },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers()
  const pathname = requestHeaders.get('x-pathname') ?? requestHeaders.get('next-url') ?? '/admin'

  if (isAuthSurfaceFlowPath('admin', pathname)) {
    return (
      <div className="portal-theme min-h-screen bg-background text-foreground">
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
      redirect('/admin/security?invitation=expired')
    }
    if (error instanceof Err && error.message.startsWith('Multi-factor')) {
      redirect('/admin/security?required=1')
    }
    if (error instanceof Err && error.message.startsWith('Sign in again')) {
      redirect('/admin/security?reauth=1')
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="shrink-0 text-sm font-semibold">BestForex Admin</span>
            <Link href="/business" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Business Portal
            </Link>
          </div>
          <nav aria-label="Admin navigation" className="flex gap-2 overflow-x-auto pb-1">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <Toaster />
    </div>
  )
}
