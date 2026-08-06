import type { Metadata } from 'next'
import { getSessionContext } from '@/lib/guards'
import { resolveActiveBrand } from '@/lib/portal/active-brand'
import { query } from '@/lib/portal/db'
import type { MediaAsset } from '@/types/portal'
import { MediaManager } from './media-manager'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Media' }

export default async function MediaPage() {
  const ctx = await getSessionContext()
  const active = ctx ? await resolveActiveBrand(ctx.brands) : null
  if (!active) return null

  const canWrite =
    ctx!.profile.role === 'admin' ||
    (active.portal_access !== 'paused' && !active.portal_locked)

  const assets = await query<MediaAsset>(
    `select * from public.media_assets
      where brand_id = $1 and status <> 'rejected'
      order by kind asc, sort_order asc, created_at desc`,
    [active.id],
  )

  const logo = assets.find((a) => a.kind === 'logo') ?? null
  const screenshots = assets.filter((a) => a.kind === 'screenshot')

  return (
    <div className="mx-auto max-w-3xl">
      <header className="anim-fade-up mb-10 pt-4 text-center">
        <p className="eyebrow">Brand assets</p>
        <h1 className="mt-2 text-balance text-[clamp(28px,4.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em] text-[#1D1D1F]">
          Media
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-[17px] leading-[1.47] text-[#86868B]">
          Upload a square logo and up to eight platform screenshots. Images are re-encoded and
          optimised automatically; SVGs are not accepted.
        </p>
      </header>
      <MediaManager
        brandId={active.id}
        canWrite={canWrite}
        initialLogo={logo}
        initialScreenshots={screenshots}
      />
    </div>
  )
}
