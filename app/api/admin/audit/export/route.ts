import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/guards'
import { query } from '@/lib/portal/db'

function cell(value: unknown): string {
  const raw = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  const text = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw
  return `"${text.replaceAll('"', '""').replace(/[\r\n]+/g, ' ')}"`
}

export async function GET(request: NextRequest) {
  const actor = await requireStaff('audit:export')
  if (!actor.isSuperAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const params = request.nextUrl.searchParams
  const email = (params.get('actor') ?? '').trim().slice(0, 120)
  const action = (params.get('action') ?? '').trim().slice(0, 80)
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.get('from') ?? '') ? params.get('from') : null
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.get('to') ?? '') ? params.get('to') : null
  const rows = await query<{ actor_email: string | null; action: string; target: string | null; brand_name: string | null; meta: Record<string, unknown>; created_at: string }>(
    `select a.actor_email, a.action, a.target, b.name as brand_name, a.meta, a.created_at
       from public.audit_log a left join public.brands b on b.id = a.brand_id
      where ($1::text = '' or a.actor_email ilike '%' || $1 || '%')
        and ($2::text = '' or a.action = $2)
        and ($3::date is null or a.created_at >= $3::date)
        and ($4::date is null or a.created_at < $4::date + interval '1 day')
      order by a.created_at desc limit 2000`,
    [email, action, from, to],
  )
  const lines = [['actor', 'action', 'target', 'broker', 'before_after', 'created_at'], ...rows.map((row) => [row.actor_email, row.action, row.target, row.brand_name, row.meta, row.created_at])]
  return new NextResponse(lines.map((line) => line.map(cell).join(',')).join('\r\n'), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="bestforex-audit.csv"', 'cache-control': 'private, no-store' },
  })
}
