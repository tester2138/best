import { query } from '@/lib/portal/db'
import { requireStaff } from '@/lib/guards'
import { ModerationClient, type QueueItem } from './moderation-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Moderation · BestForex Portal',
  robots: { index: false, follow: false },
}

interface RawRow {
  id: string
  brand_id: string
  brand_name: string
  brand_slug: string
  target_type: 'section' | 'offer' | 'media'
  target_id: string
  payload: Record<string, unknown> | null
  auto_flags: { field?: string; detail?: string }[] | null
  submitted_by_email: string | null
  created_at: string
  published: Record<string, unknown> | null
  offer: Record<string, unknown> | null
  media: Record<string, unknown> | null
}

export default async function ModerationPage() {
  const actor = await requireStaff('moderation:review')
  // Pending items oldest first, each enriched with the "current live" copy so
  // the client can render a before/after diff without extra round-trips.
  const rows = await query<RawRow>(
    `select q.id, q.brand_id, b.name as brand_name, b.slug as brand_slug,
            q.target_type, q.target_id, q.payload, q.auto_flags,
            q.created_at,
            (select p.email from public.profiles p where p.id = q.submitted_by) as submitted_by_email,
            (select s.published from public.broker_page_sections s
              where s.brand_id = q.brand_id and s.section_key = q.target_id
                and q.target_type = 'section') as published,
            (select to_jsonb(o) from public.offers o
              where o.id::text = q.target_id and q.target_type = 'offer') as offer,
            (select to_jsonb(m) from public.media_assets m
              where m.id::text = q.target_id and q.target_type = 'media') as media
       from public.moderation_queue q
       join public.brands b on b.id = q.brand_id
      where q.status = 'pending'
        and ($1::boolean or exists (
          select 1 from public.staff_access sa
           where sa.user_id = $1::text and sa.status = 'active' and sa.scope_mode = 'all'
        ) or exists (
          select 1 from public.staff_brand_scopes sc
           where sc.user_id = $1::text and sc.brand_id = q.brand_id
        ))
      order by q.created_at asc`,
    [actor.isSuperAdmin],
  )

  const items: QueueItem[] = rows.map((r) => ({
    id: r.id,
    brandId: r.brand_id,
    brandName: r.brand_name,
    brandSlug: r.brand_slug,
    targetType: r.target_type,
    targetId: r.target_id,
    payload: r.payload ?? {},
    autoFlags: r.auto_flags ?? [],
    submittedBy: r.submitted_by_email,
    createdAt: r.created_at,
    published: r.published ?? null,
    offer: r.offer ?? null,
    media: (r.media as QueueItem['media']) ?? null,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} item{items.length === 1 ? '' : 's'} awaiting review
        </p>
      </div>
      <ModerationClient items={items} />
    </div>
  )
}
