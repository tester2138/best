import { notFound } from 'next/navigation'
import { query } from '@/lib/portal/db'
import { hasGlobalStaffScope, requireStaff } from '@/lib/guards'
import { EnquiriesClient, type Enquiry } from './enquiries-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Merchant requests · BestForex Portal', robots: { index: false, follow: false } }

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; intent?: string }>
}) {
  const actor = await requireStaff('leads:read')
  if (!(await hasGlobalStaffScope(actor))) notFound()
  const params = await searchParams
  const term = (params.q ?? '').trim().slice(0, 100)
  const requestedStatus = params.status ?? ''
  const status = ['new', 'contacted', 'resolved', 'dismissed'].includes(requestedStatus) ? requestedStatus : ''
  const requestedIntent = params.intent ?? ''
  const intent = ['claim', 'partnership', 'advertising', 'general'].includes(requestedIntent)
    ? requestedIntent
    : ''
  const rows = await query<Enquiry>(
    `select id, intent, full_name, work_email, company, website, phone, message, details, status, created_at
       from public.contact_submissions
      where ($1::text = '' or status = $1)
        and ($2::text = '' or intent = $2)
        and ($3::text = '' or full_name ilike '%' || $3 || '%' or work_email ilike '%' || $3 || '%' or company ilike '%' || $3 || '%')
      order by case status when 'new' then 0 when 'contacted' then 1 else 2 end, created_at desc
      limit 200`,
    [status, intent, term],
  )
  return <EnquiriesClient enquiries={rows} query={term} status={status} intent={intent} />
}
