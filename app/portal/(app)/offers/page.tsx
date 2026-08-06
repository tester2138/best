import type { Metadata } from 'next'
import { getSessionContext } from '@/lib/guards'
import { resolveActiveBrand } from '@/lib/portal/active-brand'
import { query } from '@/lib/portal/db'
import type { Offer } from '@/types/portal'
import { OffersManager } from './offers-manager'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Offers' }

export default async function OffersPage() {
  const ctx = await getSessionContext()
  const active = ctx ? await resolveActiveBrand(ctx.brands) : null
  if (!active) return null

  const canWrite =
    ctx!.profile.role === 'admin' ||
    (active.portal_access !== 'paused' && !active.portal_locked)

  const offers = await query<Offer>(
    `select * from public.offers
      where brand_id = $1 and status <> 'archived'
      order by sort_order asc, created_at desc`,
    [active.id],
  )

  return (
    <div className="mx-auto max-w-3xl">
      <header className="anim-fade-up mb-10 pt-4 text-center">
        <p className="eyebrow">Promotions</p>
        <h1 className="mt-2 text-balance text-[clamp(28px,4.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em] text-[#1D1D1F]">
          Offers
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-[17px] leading-[1.47] text-[#86868B]">
          Promotions shown on your public profile. Terms are required and every offer is reviewed
          before it goes live.
        </p>
      </header>
      <OffersManager brandId={active.id} canWrite={canWrite} initialOffers={offers} />
    </div>
  )
}
