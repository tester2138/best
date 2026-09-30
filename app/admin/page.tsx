import Link from 'next/link'
import { query, queryOne } from '@/lib/portal/db'
import { requireStaff } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const row = await queryOne<{ n: string }>(sql, params)
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
  const actor = await requireStaff('dashboard:read')
  const scopeClause = `($2::boolean or exists (
    select 1 from public.staff_access sa
     where sa.user_id = $1 and sa.status = 'active' and sa.scope_mode = 'all'
  ) or exists (
    select 1 from public.staff_brand_scopes sc
     where sc.user_id = $1 and sc.brand_id = scoped.brand_id
  ))`
  const brandScopeClause = `($2::boolean or exists (
    select 1 from public.staff_access sa
     where sa.user_id = $1 and sa.status = 'active' and sa.scope_mode = 'all'
  ) or exists (
    select 1 from public.staff_brand_scopes sc
     where sc.user_id = $1 and sc.brand_id = scoped.id
  ))`
  const scopeParams = [actor.id, actor.isSuperAdmin]
  const [drafts, claims, verificationDue, activeCampaigns, endingCampaigns, openEnquiries, published, recent] = await Promise.all([
    count(
      `select count(*)::text as n from public.broker_page_sections scoped
        where scoped.status in ('draft', 'pending_review') and ${scopeClause}`,
      scopeParams,
    ),
    count(`select count(*)::text as n from public.claim_requests where status = 'new'`),
    count(
      `select count(*)::text as n from public.brands scoped
        where (scoped.verification_status <> 'verified'
          or scoped.updated_at < now() - interval '90 days') and ${brandScopeClause}`,
      scopeParams,
    ),
    count(
      `select count(*)::text as n from public.offers scoped
        where scoped.status = 'active'
          and (scoped.starts_at is null or scoped.starts_at <= now())
          and (scoped.ends_at is null or scoped.ends_at >= now()) and ${scopeClause}`,
      scopeParams,
    ),
    count(
      `select count(*)::text as n from public.offers scoped
        where scoped.status = 'active' and scoped.ends_at >= now()
          and scoped.ends_at < now() + interval '7 days' and ${scopeClause}`,
      scopeParams,
    ),
    count(`select count(*)::text as n from public.contact_submissions where status in ('new', 'contacted')`),
    count(`select count(*)::text as n from public.posts where status = 'published' and published_at <= now()`),
    query<AuditRow>(
      `select id::text, actor_email, action, target, created_at
         from public.audit_log order by created_at desc limit 8`,
    ),
  ])

  const stats = [
    { label: 'Pending drafts', value: drafts, href: roleHasPermission(actor.role, 'moderation:review') ? '/admin/moderation' : undefined },
    { label: 'New broker claims', value: claims, href: roleHasPermission(actor.role, 'leads:read') ? '/admin/leads' : undefined },
    { label: 'Verification review due', value: verificationDue, href: roleHasPermission(actor.role, 'brokers:read') ? '/admin/brands' : undefined },
    { label: 'Active campaigns', value: activeCampaigns, href: roleHasPermission(actor.role, 'brokers:read') ? '/admin/brands' : undefined },
    { label: 'Ending within 7 days', value: endingCampaigns, href: roleHasPermission(actor.role, 'brokers:read') ? '/admin/brands' : undefined },
    { label: 'Open enquiries', value: openEnquiries, href: roleHasPermission(actor.role, 'leads:read') ? '/admin/enquiries' : undefined },
    { label: 'Published content', value: published, href: roleHasPermission(actor.role, 'editorial:read') ? '/admin/news' : undefined },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live operational overview</p>
      </div>

      <section aria-label="Operational metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const content = (
            <Card className="h-full p-5 transition-colors hover:bg-muted/50">
              <div className="text-3xl font-semibold tabular-nums">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          )
          return stat.href ? <Link key={stat.label} href={stat.href}>{content}</Link> : <div key={stat.label}>{content}</div>
        })}
      </section>

      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="mb-3 text-sm font-semibold">Recent activity</h2>
        <Card className="divide-y divide-border">
          {recent.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No activity yet.</div> : null}
          {recent.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm">
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">{row.action}</span>
                {row.target ? <span className="truncate text-muted-foreground">{row.target}</span> : null}
              </div>
              <div className="flex flex-col items-end text-xs text-muted-foreground">
                <span>{row.actor_email ?? 'system'}</span>
                <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</time>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  )
}
