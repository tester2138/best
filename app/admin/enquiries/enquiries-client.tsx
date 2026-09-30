'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { updateContactStatus } from '@/app/actions/enquiries'

export interface Enquiry {
  id: string
  intent: 'claim' | 'partnership' | 'advertising' | 'general'
  full_name: string
  work_email: string
  company: string
  message: string
  status: 'new' | 'contacted' | 'resolved' | 'dismissed'
  created_at: string
}

export function EnquiriesClient({ enquiries, query, status }: { enquiries: Enquiry[]; query: string; status: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  function update(id: string, nextStatus: Enquiry['status']) {
    startTransition(async () => {
      const result = await updateContactStatus({ id, status: nextStatus })
      if (result.ok) { toast.success('Request updated'); router.refresh() }
      else toast.error(result.error ?? 'Could not update the request')
    })
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Merchant requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Private contact submissions and commercial enquiries</p>
      </div>
      <form className="flex flex-col gap-3 sm:flex-row" action="/admin/enquiries">
        <Input name="q" defaultValue={query} placeholder="Search name, company or email" aria-label="Search requests" />
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="status" defaultValue={status} aria-label="Filter by status">
          <option value="">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option>
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      {enquiries.length === 0 ? <Card className="p-8 text-sm text-muted-foreground">No requests match these filters.</Card> : (
        <div className="flex flex-col gap-3">
          {enquiries.map((item) => (
            <Card key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-medium">{item.company}</h2><Badge variant="outline">{item.intent}</Badge><Badge variant={item.status === 'new' ? 'default' : 'secondary'}>{item.status}</Badge></div>
                <p className="mt-1 text-sm">{item.full_name} · <a className="text-primary hover:underline" href={`mailto:${encodeURIComponent(item.work_email)}`}>{item.work_email}</a></p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.message}</p>
                <time className="mt-2 block text-xs text-muted-foreground" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['contacted', 'resolved', 'dismissed'] as const).filter((value) => value !== item.status).map((value) => (
                  <Button key={value} variant="outline" size="sm" disabled={pending} onClick={() => update(item.id, value)}>{value}</Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
