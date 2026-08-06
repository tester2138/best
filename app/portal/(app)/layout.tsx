import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSessionContext } from '@/lib/guards'
import { resolveActiveBrand } from '@/lib/portal/active-brand'
import { PortalShell, type ShellBrand } from './portal-shell'
import { ActiveBrandProvider } from './active-brand-context'
import { Toaster } from '@/components/ui/sonner'

const FORCE_PASSWORD_CHANGE = (process.env.FORCE_PASSWORD_CHANGE ?? 'true') !== 'false'

export default async function PortalAppLayout({ children }: { children: ReactNode }) {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/portal/login')

  // Forced first-login password change (Blueprint 11.4).
  if (FORCE_PASSWORD_CHANGE && ctx.profile.mustChangePassword) redirect('/portal/set-password')

  // Admins without a brand membership belong in the admin panel.
  if (ctx.brands.length === 0) {
    if (ctx.profile.role === 'admin') redirect('/admin')
    redirect('/portal/no-access')
  }

  const active = await resolveActiveBrand(ctx.brands)
  if (!active) redirect('/portal/no-access')

  const toShell = (b: (typeof ctx.brands)[number]): ShellBrand => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    portal_access: b.portal_access,
    portal_locked: b.portal_locked,
  })

  return (
    <ActiveBrandProvider
      value={{
        brandId: active.id,
        slug: active.slug,
        name: active.name,
        canWrite: active.portal_access === 'active' && !active.portal_locked,
      }}
    >
      <PortalShell
        activeBrand={toShell(active)}
        brands={ctx.brands.map(toShell)}
        userName={ctx.profile.fullName ?? ctx.user.email}
      >
        {children}
      </PortalShell>
      <Toaster />
    </ActiveBrandProvider>
  )
}
