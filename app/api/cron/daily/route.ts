import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/portal/db'
import { revalidateBrand } from '@/lib/portal/revalidate'
import { sendEmail } from '@/lib/email/send'

// Portal maintenance job — runs daily at 03:00 UTC (Blueprint Section 17.4).
// Expires finished offers and stale invitations, rolls yesterday's raw events
// into page_events_daily, purges raw events older than 90 days, and emails a
// renewal digest for brands renewing within 7 days.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  const secret = process.env.CRON_SECRET
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. When no secret is
  // configured (local dev) we allow the call through so the job is testable.
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const now = new Date().toISOString()

  // 1. Expire finished offers, then revalidate each affected broker page.
  const expired = await query<{ slug: string }>(
    `with done as (
       update public.offers o
          set status = 'expired'
        where o.status = 'active' and o.ends_at is not null and o.ends_at < $1
        returning o.brand_id
     )
     select distinct b.slug
       from done
       join public.brands b on b.id = done.brand_id`,
    [now],
  )
  for (const { slug } of expired) revalidateBrand(slug)

  // 2. Expire stale invitations.
  await query(
    `update public.invitations set status = 'expired'
      where status = 'sent' and expires_at < $1`,
    [now],
  )

  // 3. Roll up yesterday's events, then purge raw rows older than 90 days.
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  await query(
    `insert into public.page_events_daily (brand_id, day, views, cta_clicks, offer_clicks)
     select brand_id, $1::date,
            count(*) filter (where event = 'view'),
            count(*) filter (where event = 'cta_click'),
            count(*) filter (where event = 'offer_click')
       from public.page_events
      where created_at >= $1::date and created_at < ($1::date + 1)
        and brand_id is not null
      group by brand_id
     on conflict (brand_id, day) do update
        set views = excluded.views,
            cta_clicks = excluded.cta_clicks,
            offer_clicks = excluded.offer_clicks`,
    [yesterday],
  )
  await query(`delete from public.page_events where created_at < $1`, [
    new Date(Date.now() - 90 * 86400000).toISOString(),
  ])

  // 4. Renewal reminders — one admin digest for brands renewing within 7 days.
  const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const renewals = await query<{ name: string; slug: string; renewal_date: string }>(
    `select name, slug, renewal_date
       from public.brands
      where renewal_date is not null and renewal_date <= $1::date
        and portal_access = 'active'
      order by renewal_date asc`,
    [soon],
  )
  const adminEmail = (process.env.ADMIN_EMAILS ?? '').split(',')[0]?.trim()
  if (renewals.length && adminEmail) {
    await sendEmail('renewal-digest', adminEmail, { rows: renewals })
  }

  return NextResponse.json({
    ok: true,
    expiredBrands: expired.length,
    renewals: renewals.length,
    rolledUpDay: yesterday,
  })
}
