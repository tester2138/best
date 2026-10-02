import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  FileText,
  Inbox,
  Megaphone,
  ShieldCheck,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { query, queryOne } from '@/lib/portal/db'
import { hasGlobalStaffScope, requireStaffPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const row = await queryOne<{ n: string }>(sql, params)
  return Number(row?.n ?? '0')
}

async function optionalCount(sql: string, params: unknown[] = []): Promise<number | null> {
  try {
    return await count(sql, params)
  } catch (error) {
    console.error('[v0] optional admin dashboard metric unavailable:', error)
    return null
  }
}

interface AuditRow {
  id: string
  actor_email: string | null
  action: string
  target: string | null
  created_at: string
}

export default async function AdminDashboardPage() {
  const actor = await requireStaffPage('dashboard:read')
  const globalScope = await hasGlobalStaffScope(actor)
  const canReview = roleHasPermission(actor.role, 'moderation:review')
  const canReadLeads = roleHasPermission(actor.role, 'leads:read')
  const canManageOffers = roleHasPermission(actor.role, 'brokers:manage')
  const canReadEditorial = roleHasPermission(actor.role, 'editorial:read')
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
  const claimScopeClause = `($2::boolean or exists (
    select 1 from public.staff_access sa
     where sa.user_id = $1 and sa.status = 'active' and sa.scope_mode = 'all'
  ) or exists (
    select 1 from public.staff_brand_scopes sc
     where sc.user_id = $1 and sc.brand_id = c.brand_id
  ))`
  const offerScopeClause = `($2::boolean or exists (
    select 1 from public.staff_access sa
     where sa.user_id = $1 and sa.status = 'active' and sa.scope_mode = 'all'
  ) or exists (
    select 1 from public.staff_brand_scopes sc
     where sc.user_id = $1 and sc.brand_id = b.id
  ))`
  const scopeParams = [actor.id, actor.hasFullAccess]
  const [drafts, claims, verificationDue, activeCampaigns, endingOffers, openEnquiries, published, recent] = await Promise.all([
    canReview
      ? count(
          `select count(*)::text as n from public.broker_page_sections scoped
            where scoped.status in ('draft', 'pending_review') and ${scopeClause}`,
          scopeParams,
        )
      : Promise.resolve(0),
    canReadLeads
      ? count(
          `select count(*)::text as n from public.claim_requests c
            where c.status = 'new' and ${claimScopeClause}`,
          scopeParams,
        )
      : Promise.resolve(0),
    count(
      `select count(*)::text as n from public.brands scoped
        where (scoped.verification_status <> 'verified'
          or scoped.updated_at < now() - interval '90 days') and ${brandScopeClause}`,
      scopeParams,
    ),
    canManageOffers && globalScope
      ? optionalCount(
          `select count(*)::text as n from public.ad_campaigns
            where campaign_type = 'paid'
              and status = 'active'
              and (starts_at is null or starts_at <= now())
              and (ends_at is null or ends_at >= now())`,
        )
      : Promise.resolve(null),
    canManageOffers
      ? optionalCount(
          `select count(*)::text as n from public.admin_offers scoped
            left join public.brands b on b.slug = scoped.broker_id
            where scoped.status = 'active'
              and scoped.ends_at >= now()
              and scoped.ends_at < now() + interval '7 days'
              and ${offerScopeClause}`,
          scopeParams,
        )
      : Promise.resolve(null),
    canReadLeads && globalScope
      ? count(`select count(*)::text as n from public.contact_submissions where status in ('new', 'contacted')`)
      : Promise.resolve(0),
    canReadEditorial
      ? count(`select count(*)::text as n from public.posts where status = 'published' and published_at <= now()`)
      : Promise.resolve(0),
    query<AuditRow>(
      `select a.id::text, a.actor_email, a.action, a.target, a.created_at
         from public.audit_log a
        where ($2::boolean or exists (
          select 1 from public.staff_access sa
           where sa.user_id = $1 and sa.status = 'active' and sa.scope_mode = 'all'
        ) or exists (
          select 1 from public.staff_brand_scopes sc
           where sc.user_id = $1 and sc.brand_id = a.brand_id
        ))
        order by a.created_at desc limit 8`,
      [actor.id, globalScope],
    ),
  ])

  const stats = [
    ...(canReview ? [{ label: 'Pending drafts', value: drafts, href: '/admin/moderation' }] : []),
    ...(canReadLeads ? [{ label: 'New broker claims', value: claims, href: '/admin/leads' }] : []),
    { label: 'Verification review due', value: verificationDue, href: '/admin/brands' },
    ...(activeCampaigns !== null ? [{ label: 'Active paid campaigns', value: activeCampaigns, href: '/admin/advertising' }] : []),
    ...(endingOffers !== null ? [{ label: 'Offers ending within 7 days', value: endingOffers, href: '/admin/offers' }] : []),
    ...(canReadLeads && globalScope ? [{ label: 'Open enquiries', value: openEnquiries, href: '/admin/enquiries' }] : []),
    ...(canReadEditorial ? [{ label: 'Published content', value: published, href: '/admin/news' }] : []),
  ]

  const statIcons: Record<string, LucideIcon> = {
    'Pending drafts': FileText,
    'New broker claims': Users,
    'Verification review due': ShieldCheck,
    'Active paid campaigns': Megaphone,
    'Offers ending within 7 days': Tag,
    'Open enquiries': Inbox,
    'Published content': BookOpen,
  }

  return (
    <div className="flex flex-col gap-9">
      <header className="admin-page-heading">
        <p className="admin-eyebrow">Operations</p>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live operational overview</p>
      </header>

      <section aria-label="Operational metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = statIcons[stat.label] ?? Activity
          return (
            <Link key={stat.label} href={stat.href} className="admin-metric-link">
              <Card className="admin-metric-card h-full p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="admin-metric-value text-4xl font-semibold tabular-nums">{stat.value}</div>
                  <span className="admin-metric-icon">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="admin-metric-label">{stat.label}</span>
                  <ArrowUpRight aria-hidden="true" className="admin-metric-arrow size-4" />
                </div>
              </Card>
            </Link>
          )
        })}
      </section>

      <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 id="activity-heading" className="text-lg font-semibold">Recent activity</h2>
          <p className="text-sm text-muted-foreground">Latest {recent.length} events</p>
        </div>
        <Card className="admin-activity-list divide-y divide-border">
          {recent.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No activity yet.</div> : null}
          {recent.map((row) => (
            <div key={row.id} className="admin-activity-row flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="admin-activity-event text-sm">{row.action}</span>
                {row.target ? <span className="break-words text-sm text-muted-foreground">{row.target}</span> : null}
              </div>
              <div className="admin-activity-meta flex min-w-0 flex-col items-end text-sm">
                <span className="max-w-full break-all">{row.actor_email ?? 'system'}</span>
                <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</time>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  )
}
