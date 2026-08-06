'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { setClaimStatus } from '@/app/actions/claims'

export interface Lead {
  id: string
  fullName: string
  workEmail: string
  message: string | null
  status: 'new' | 'contacted' | 'assigned' | 'dismissed'
  createdAt: string
  brandName: string | null
  brandSlug: string | null
}

const STATUS: Record<Lead['status'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  new: { label: 'New', variant: 'default' },
  contacted: { label: 'Contacted', variant: 'secondary' },
  assigned: { label: 'Assigned', variant: 'outline' },
  dismissed: { label: 'Dismissed', variant: 'outline' },
}

const NEXT: Lead['status'][] = ['new', 'contacted', 'assigned', 'dismissed']

export function LeadsClient({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function update(id: string, status: Lead['status']) {
    startTransition(async () => {
      const res = await setClaimStatus({ id, status })
      if (res.ok) {
        toast.success('Lead updated')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Could not update lead')
      }
    })
  }

  if (leads.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Claim requests submitted from broker pages will appear here.
      </Card>
    )
  }

  return (
    <Card className="divide-y divide-border">
      {leads.map((lead) => (
        <div key={lead.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{lead.fullName}</span>
              <Badge variant={STATUS[lead.status].variant}>{STATUS[lead.status].label}</Badge>
            </div>
            <a
              href={`mailto:${lead.workEmail}`}
              className="text-sm text-primary hover:underline"
            >
              {lead.workEmail}
            </a>
            <span className="text-xs text-muted-foreground">
              {lead.brandSlug ? (
                <>
                  For{' '}
                  <Link href={`/brokers/${lead.brandSlug}`} className="hover:underline">
                    {lead.brandName ?? lead.brandSlug}
                  </Link>
                  {' · '}
                </>
              ) : null}
              {new Date(lead.createdAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
            {lead.message && (
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">{lead.message}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/brands">Assign brand</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={pending}>
                  Set status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {NEXT.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    disabled={s === lead.status}
                    onClick={() => update(lead.id, s)}
                  >
                    {STATUS[s].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </Card>
  )
}
