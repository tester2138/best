import Link from 'next/link'
import { query, queryOne } from '@/lib/portal/db'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

async function count(sql: string): Promise<number> {
  const row = await queryOne<{ n: string }>(sql)
  return Number(row?.n ?? '0')
}

interface AuditRow {
  id: string
  actor_email: string | null
  action: string
  target: string | null
  created_at: string
}

export default async function AdminDashboardPage() {
  const [claimed, pendingMod, newLeads, awaitingLogin, recent] = await Promise.all([
    count(`select count(*)::text as n from public.brands where is_claimed = true`),
    count(`select count(*)::text as n from public.moderation_queue where status = 'pending'`),
    count(`select count(*)::text as n from public.claim_requests where status = 'new'`),
    count(
      `select count(*)::text as n from public.invitations i
         where i.status = 'sent'
           and exists (
             select 1 from public.profiles p
              where p.email = i.email and p.must_change_password = true
           )`,
    ),
    query<AuditRow>(
      `select id, actor_email, action, target, created_at
         from public.audit_log order by created_at desc limit 10`,
    ),
  ])

  const stats = [
    { label: 'Claimed brands', value: claimed, href: '/admin/brands' },
    { label: 'Pending moderation', value: pendingMod, href: '/admin/moderation' },
    { label: 'New claim leads', value: newLeads, href: '/admin/leads' },
    { label: 'Awaiting first login', value: awaitingLogin, href: '/admin/brands' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Broker portal overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-5 transition-colors hover:bg-muted/50">
              <div className="text-3xl font-semibold tabular-nums">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
        <Card className="divide-y divide-border">
          {recent.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No activity yet.</div>
          )}
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 p-4 text-sm">
              <div className="flex flex-col">
                <span className="font-medium">{r.action}</span>
                {r.target && <span className="text-muted-foreground">{r.target}</span>}
              </div>
              <div className="flex flex-col items-end text-xs text-muted-foreground">
                <span>{r.actor_email ?? 'system'}</span>
                <time dateTime={r.created_at}>
                  {new Date(r.created_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
