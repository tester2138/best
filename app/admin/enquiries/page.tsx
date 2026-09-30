import { query } from '@/lib/portal/db'
import { requireStaff } from '@/lib/guards'
import { EnquiriesClient, type Enquiry } from './enquiries-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Merchant requests · BestForex Portal', robots: { index: false, follow: false } }

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  await requireStaff('leads:read')
  const params = await searchParams
  const term = (params.q ?? '').trim().slice(0, 100)
  const status = ['new', 'contacted', 'resolved', 'dismissed'].includes(params.status ?? '') ? params.status : ''
  const rows = await query<Enquiry>(
    `select id, intent, full_name, work_email, company, message, status, created_at
       from public.contact_submissions
      where ($1::text = '' or status = $1)
        and ($2::text = '' or full_name ilike '%' || $2 || '%' or work_email ilike '%' || $2 || '%' or company ilike '%' || $2 || '%')
      order by case status when 'new' then 0 when 'contacted' then 1 else 2 end, created_at desc
      limit 200`,
    [status, term],
  )
  return <EnquiriesClient enquiries={rows} query={term} status={status} />
}
