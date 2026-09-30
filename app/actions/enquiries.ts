'use server'

import { z } from 'zod'
import { run, Err } from '@/lib/portal/result'
import { hasGlobalStaffScope, requireStaff } from '@/lib/guards'
import { queryOne } from '@/lib/portal/db'
import { audit } from '@/lib/audit'

export async function updateContactStatus(raw: unknown) {
  return run(async () => {
    const actor = await requireStaff('leads:manage')
    if (!(await hasGlobalStaffScope(actor))) throw new Err('Not found', 'not_found')
    const input = z.object({ id: z.string().uuid(), status: z.enum(['new', 'contacted', 'resolved', 'dismissed']) }).parse(raw)
    const updated = await queryOne<{
      id: string
      status: string
      previous_status: string
      intent: string
      company: string
    }>(
      `with current as (
         select id, status from public.contact_submissions where id = $1 for update
       ), changed as (
         update public.contact_submissions target
            set status = $2, updated_at = now()
           from current
          where target.id = current.id
          returning target.id, target.status, current.status as previous_status,
                    target.intent, target.company
       )
       select id, status, previous_status, intent, company from changed`,
      [input.id, input.status],
    )
    if (!updated) throw new Err('Request not found.', 'not_found')
    await audit(actor, null, 'enquiry.status', updated.company, {
      id: updated.id,
      intent: updated.intent,
      before: { status: updated.previous_status },
      after: { status: updated.status },
    })
    return { ok: true }
  })
}
