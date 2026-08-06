import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/guards'
import { Err } from '@/lib/portal/result'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Admin · BestForex Portal',
  robots: { index: false, follow: false },
}

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/brands', label: 'Brands' },
  { href: '/admin/moderation', label: 'Moderation' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/bulk-import', label: 'Bulk Import' },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Defense layer 2: server-side admin gate. requireAdmin throws not_found for
  // non-admins and forbidden for anonymous — both bounce to the portal login.
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof Err && e.code === 'forbidden') redirect('/business/login?next=/admin')
    redirect('/business/login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold">BestForex Admin</span>
            <nav className="flex items-center gap-4">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/business"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Business Portal
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <Toaster />
    </div>
  )
}
