import Link from 'next/link'
import { query } from '@/lib/portal/db'
import { hasGlobalStaffScope, requireStaff } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Audit log · BestForex Portal', robots: { index: false, follow: false } }

interface AuditRow {
  id: string
  actor_email: string | null
  action: string
  target: string | null
  brand_name: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ actor?: string; action?: string; from?: string; to?: string }> }) {
  const actor = await requireStaff('audit:read')
  const globalScope = await hasGlobalStaffScope(actor)
  const filters = await searchParams
  const actorFilter = (filters.actor ?? '').trim().slice(0, 120)
  const action = (filters.action ?? '').trim().slice(0, 80)
  const from = /^\d{4}-\d{2}-\d{2}$/.test(filters.from ?? '') ? filters.from! : ''
  const to = /^\d{4}-\d{2}-\d{2}$/.test(filters.to ?? '') ? filters.to! : ''
  const rows = await query<AuditRow>(
    `select a.id::text, a.actor_email, a.action, a.target, b.name as brand_name, a.meta, a.created_at
       from public.audit_log a left join public.brands b on b.id = a.brand_id
      where ($1::text = '' or a.actor_email ilike '%' || $1 || '%')
        and ($2::text = '' or a.action = $2)
        and ($3::date is null or a.created_at >= $3::date)
        and ($4::date is null or a.created_at < $4::date + interval '1 day')
        and ($5::boolean or exists (
          select 1 from public.staff_brand_scopes sc
           where sc.user_id = $6 and sc.brand_id = a.brand_id
        ))
      order by a.created_at desc limit 250`,
    [actorFilter, action, from || null, to || null, globalScope, actor.id],
  )
  const exportQuery = new URLSearchParams({ actor: actorFilter, action, from, to })
  const canExport = roleHasPermission(actor.role, 'audit:export')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rows.length} recent, filtered events · up to 250 rows</p>
        </div>
        {canExport ? <Button asChild variant="outline"><Link href={`/api/admin/audit/export?${exportQuery.toString()}`}>Export CSV</Link></Button> : null}
      </div>

      <form action="/admin/audit" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input name="actor" defaultValue={actorFilter} placeholder="Actor email" aria-label="Filter by actor" />
        <Input name="action" defaultValue={action} placeholder="Action key" aria-label="Filter by action" />
        <Input name="from" type="date" defaultValue={from} aria-label="From date" />
        <Input name="to" type="date" defaultValue={to} aria-label="To date" />
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      {rows.length === 0 ? (
        <Card className="p-8 text-sm text-muted-foreground">No audit events match these filters.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const meta = row.meta ?? {}
            const otherMeta = Object.fromEntries(Object.entries(meta).filter(([key]) => key !== 'before' && key !== 'after'))
            return (
              <Card key={row.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{row.action}{row.target ? ` · ${row.target}` : ''}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{row.actor_email ?? 'system'}{row.brand_name ? ` · ${row.brand_name}` : ''}</p>
                  </div>
                  <time className="text-xs text-muted-foreground" dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time>
                </div>
                {Object.keys(meta).length > 0 ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-primary">View before / after details</summary>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {'before' in meta ? <section><h2 className="mb-1 text-xs font-semibold text-muted-foreground">Before</h2><pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">{JSON.stringify(meta.before, null, 2)}</pre></section> : null}
                      {'after' in meta ? <section><h2 className="mb-1 text-xs font-semibold text-muted-foreground">After</h2><pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">{JSON.stringify(meta.after, null, 2)}</pre></section> : null}
                    </div>
                    {Object.keys(otherMeta).length > 0 ? <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">{JSON.stringify(otherMeta, null, 2)}</pre> : null}
                  </details>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
