'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Tag,
  ImageIcon,
  Settings,
  ChevronDown,
  Check,
  Lock,
  PauseCircle,
  LogOut,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/actions/auth'
import { switchBrand } from '@/app/actions/portal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface ShellBrand {
  id: string
  name: string
  slug: string
  portal_access: 'active' | 'paused'
  portal_locked: boolean
}

const NAV = [
  { href: '/business', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/business/edit', label: 'Page editor', icon: FileText },
  { href: '/business/offers', label: 'Offers', icon: Tag },
  { href: '/business/media', label: 'Media', icon: ImageIcon },
  { href: '/business/settings', label: 'Settings', icon: Settings },
]

export function PortalShell({
  activeBrand,
  brands,
  userName,
  children,
}: {
  activeBrand: ShellBrand
  brands: ShellBrand[]
  userName: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [switching, startSwitch] = useTransition()

  function onSwitch(id: string) {
    if (id === activeBrand.id) return
    startSwitch(async () => {
      await switchBrand(id)
      router.refresh()
    })
  }

  const paused = activeBrand.portal_access === 'paused'
  const locked = activeBrand.portal_locked

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#E8E8ED] bg-[#FBFBFD] px-4 py-7 md:flex">
        <Link href="/business" className="flex items-center gap-2.5 px-3 pb-8">
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-[#1D1D1F]">
            <TrendingUp className="size-4 text-white" strokeWidth={2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
              Broker Portal
            </span>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#86868B]">
              BestForex.io
            </span>
          </span>
        </Link>

        <nav className="flex flex-col gap-1" aria-label="Portal">
          {NAV.map((item, i) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'anim-fade-up flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] transition-all duration-200',
                  `anim-d-${Math.min(i + 1, 5)}`,
                  active
                    ? 'bg-[#1D1D1F] font-medium text-white'
                    : 'font-normal text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]',
                )}
              >
                <Icon className="size-[18px]" strokeWidth={1.5} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto px-3">
          <p className="truncate text-[13px] text-[#86868B]">{userName}</p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="p-glass sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-3 md:px-10">
          {/* Brand switcher */}
          {brands.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] disabled:opacity-60"
                disabled={switching}
              >
                {activeBrand.name}
                <ChevronDown className="size-4 text-[#86868B]" strokeWidth={1.5} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-2xl">
                {brands.map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => onSwitch(b.id)}
                    className="flex items-center justify-between rounded-lg"
                  >
                    {b.name}
                    {b.id === activeBrand.id && <Check className="size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="px-2 text-[15px] font-medium text-[#1D1D1F]">{activeBrand.name}</span>
          )}

          <div className="flex items-center gap-2">
            <span className="hidden text-[13px] text-[#86868B] sm:inline">{userName}</span>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] text-[#6E6E73] transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
              >
                <LogOut className="size-4" strokeWidth={1.5} />
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Access banners */}
        {locked && (
          <div className="flex items-center gap-2 border-b border-[#E8E8ED] bg-[#F5F5F7] px-8 py-2.5 text-[13px] text-[#1D1D1F]">
            <Lock className="size-4" strokeWidth={1.5} />
            This profile is locked by the BestForex.io team. Editing is disabled. Contact us to
            resolve this.
          </div>
        )}
        {!locked && paused && (
          <div className="flex items-center gap-2 border-b border-[#E8E8ED] bg-[#F5F5F7] px-8 py-2.5 text-[13px] text-[#1D1D1F]">
            <PauseCircle className="size-4" strokeWidth={1.5} />
            Portal access is paused. Your public page stays live, but editing is disabled. Contact
            BestForex.io to resume.
          </div>
        )}

        <main className="flex-1 px-6 py-10 md:px-10 md:py-12">{children}</main>
      </div>
    </div>
  )
}
