import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { TrendingUp } from 'lucide-react'
import { auth } from '@/lib/auth'
import { queryOne } from '@/lib/portal/db'

/**
 * Auth-pages layout — Apple Design Pattern Spec.
 * Split screen: campaign-tint brand hero (left) with drifting glow,
 * form pane (right) on white. Stacks on mobile with a compact hero band.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user?.id) {
    const prof = await queryOne<{ role: string; must_change_password: boolean }>(
      `select role, must_change_password from public.profiles where id = $1`,
      [session.user.id],
    )
    if (prof?.must_change_password) redirect('/business/set-password')
    else if (prof?.role === 'admin') redirect('/admin')
    else redirect('/business')
  }
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand hero */}
      <section
        aria-hidden="true"
        className="p-auth-hero flex flex-col justify-between px-8 py-8 lg:w-[46%] lg:px-14 lg:py-12"
      >
        <Link href="/" className="anim-fade-in inline-flex w-fit items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#1D1D1F]">
            <TrendingUp className="size-5 text-white" strokeWidth={2} />
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
            BestForex<span className="text-[#0071E3]">.io</span>
          </span>
        </Link>

        <div className="relative z-10 hidden py-16 lg:block">
          <p className="anim-fade-up eyebrow">Broker Portal</p>
          <h1 className="anim-fade-up anim-d-1 mt-3 max-w-md text-balance text-[clamp(32px,3.5vw,48px)] font-semibold leading-[1.07] tracking-[-0.018em] text-[#1D1D1F]">
            Your brand, in your hands.
          </h1>
          <p className="anim-fade-up anim-d-2 mt-5 max-w-sm text-pretty text-[19px] leading-[1.4] text-[#86868B]">
            <span className="font-semibold text-[#1D1D1F]">
              Manage your public broker profile.
            </span>{' '}
            Publish updates, run offers, and keep every detail current on BestForex.io.
          </p>

          <ul className="anim-fade-up anim-d-3 mt-12 flex max-w-sm flex-col gap-4">
            {[
              'Edit twelve profile sections with live preview',
              'Launch reviewed offers and campaigns',
              'Upload logos and platform screenshots',
            ].map((line) => (
              <li key={line} className="flex items-start gap-3 text-[15px] text-[#1D1D1F]">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#0071E3]" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="anim-fade-in relative z-10 hidden text-[12px] text-[#86868B] lg:block">
          Trusted broker directory since 2024.
        </p>
      </section>

      {/* Form pane */}
      <section className="flex flex-1 items-center justify-center bg-white px-6 py-14 lg:py-16">
        <div className="anim-fade-up anim-d-1 w-full max-w-[400px]">{children}</div>
      </section>
    </main>
  )
}
