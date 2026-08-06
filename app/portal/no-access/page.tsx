import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/guards'
import { logout } from '@/app/actions/auth'

export const metadata: Metadata = { title: 'No portal access' }
export const dynamic = 'force-dynamic'

export default async function NoAccessPage() {
  const user = await requireUser()

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em]">No brand assigned yet</h1>
      <p className="text-pretty leading-relaxed text-muted-foreground">
        Your account (<span className="font-medium text-foreground">{user.email}</span>) is not yet
        linked to a broker. Once BestForex.io assigns your brand, it will appear here automatically.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="mailto:portal@bestforex.io"
          className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:opacity-90"
        >
          Contact BestForex.io
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full border border-input px-5 py-2.5 text-sm hover:bg-muted"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
