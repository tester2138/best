'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  setAccess,
  setLock,
  updateDomains,
  resendInvitation,
  revokeMember,
} from '@/app/actions/admin'
import type { Brand, ActionResult } from '@/types/portal'

export interface MemberInfo {
  user_id: string
  email: string
  full_name: string | null
  must_change_password: boolean
}

export interface SectionStatusRow {
  key: string
  label: string
  status: string
  publishedAt: string | null
}

interface InvitationInfo {
  id: string
  status: string
  resend_count: number
  expires_at: string
  last_sent_at: string | null
}

interface AuditRow {
  id: string
  actor_email: string | null
  action: string
  target: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

function fmt(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

export function BrandDetailClient({
  brand,
  member,
  invitation,
  sections,
  activity,
}: {
  brand: Brand
  member: MemberInfo | null
  invitation: InvitationInfo | null
  sections: SectionStatusRow[]
  activity: AuditRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [domains, setDomains] = useState<string[]>(brand.official_domains ?? [])
  const [domainInput, setDomainInput] = useState('')

  function act(fn: () => Promise<ActionResult<unknown>>, success: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(success)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">/{brand.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {brand.portal_locked && <Badge variant="destructive">Locked</Badge>}
          <Badge variant={brand.portal_access === 'paused' ? 'secondary' : 'default'}>
            {brand.portal_access === 'paused' ? 'Paused' : 'Active'}
          </Badge>
          {brand.is_claimed && <Badge variant="outline">Claimed</Badge>}
          <Button asChild variant="ghost" size="sm">
            <a href={`/brokers/${brand.slug}`} target="_blank" rel="noreferrer">
              View public page
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="member">Member</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── Overview ─────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 flex flex-col gap-4">
          <Card className="flex items-center justify-between gap-4 p-5">
            <div>
              <div className="font-medium">Portal access</div>
              <p className="text-sm text-muted-foreground">
                Paused brands cannot publish; content stays live.
              </p>
            </div>
            <Switch
              checked={brand.portal_access === 'active'}
              disabled={pending}
              onCheckedChange={(checked) =>
                act(
                  () => setAccess({ brandId: brand.id, access: checked ? 'active' : 'paused' }),
                  checked ? 'Access resumed' : 'Access paused',
                )
              }
              aria-label="Toggle portal access"
            />
          </Card>

          <Card className="flex items-center justify-between gap-4 p-5">
            <div>
              <div className="font-medium">Lock portal</div>
              <p className="text-sm text-muted-foreground">
                Hard kill for abuse. Blocks all writes and shows a locked banner.
              </p>
            </div>
            <Switch
              checked={brand.portal_locked}
              disabled={pending}
              onCheckedChange={(checked) =>
                act(
                  () => setLock({ brandId: brand.id, locked: checked }),
                  checked ? 'Portal locked' : 'Portal unlocked',
                )
              }
              aria-label="Toggle portal lock"
            />
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <div>
              <div className="font-medium">Official domains</div>
              <p className="text-sm text-muted-foreground">
                Used to validate the member&apos;s email domain on assignment.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    const d = domainInput.trim().toLowerCase()
                    if (d && !domains.includes(d)) setDomains([...domains, d])
                    setDomainInput('')
                  }
                }}
                placeholder="broker.com"
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const d = domainInput.trim().toLowerCase()
                  if (d && !domains.includes(d)) setDomains([...domains, d])
                  setDomainInput('')
                }}
              >
                Add
              </Button>
            </div>
            {domains.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {domains.map((d) => (
                  <Badge key={d} variant="secondary" className="gap-1">
                    {d}
                    <button
                      type="button"
                      onClick={() => setDomains(domains.filter((x) => x !== d))}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${d}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  act(() => updateDomains({ brandId: brand.id, domains }), 'Domains updated')
                }
              >
                Save domains
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ── Member ───────────────────────────────────────────────── */}
        <TabsContent value="member" className="mt-4">
          <Card className="flex flex-col gap-4 p-5">
            {!member ? (
              <p className="text-sm text-muted-foreground">
                No portal user assigned. Assign one from the Brands list.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <div className="font-medium">{member.email}</div>
                  {member.full_name && (
                    <div className="text-sm text-muted-foreground">{member.full_name}</div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {invitation && (
                      <Badge variant="outline" className="capitalize">
                        {invitation.status}
                      </Badge>
                    )}
                    {member.must_change_password && (
                      <Badge variant="secondary">Awaiting first login</Badge>
                    )}
                  </div>
                  {invitation && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Invite expires {fmt(invitation.expires_at)} · resent{' '}
                      {invitation.resend_count}/10
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending || !invitation || invitation.resend_count >= 10}
                    onClick={() =>
                      invitation &&
                      act(() => resendInvitation(invitation.id), 'Invitation resent')
                    }
                  >
                    Resend invitation
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={pending}>
                        Revoke access
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke portal access?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {member.email} will be signed out everywhere and lose access to this
                          brand. The public page stays live.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            act(
                              () =>
                                revokeMember({ brandId: brand.id, userId: member.user_id }),
                              'Access revoked',
                            )
                          }
                        >
                          Revoke
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Content ──────────────────────────────────────────────── */}
        <TabsContent value="content" className="mt-4">
          <Card className="divide-y divide-border">
            {sections.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4 p-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground">
                    Published {fmt(s.publishedAt)}
                  </span>
                </div>
                <Badge
                  variant={
                    s.status === 'synced'
                      ? 'default'
                      : s.status === 'pending_review'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="capitalize"
                >
                  {s.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* ── Activity ─────────────────────────────────────────────── */}
        <TabsContent value="activity" className="mt-4">
          <Card className="divide-y divide-border">
            {activity.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No activity yet.</div>
            )}
            {activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">{a.action}</span>
                  {a.target && <span className="text-muted-foreground">{a.target}</span>}
                </div>
                <div className="flex flex-col items-end text-xs text-muted-foreground">
                  <span>{a.actor_email ?? 'system'}</span>
                  <time dateTime={a.created_at}>{fmt(a.created_at)}</time>
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
