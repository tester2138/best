'use server'

import { z } from 'zod'
import { run, Err } from '@/lib/portal/result'
import { requireStaff } from '@/lib/guards'
import { queryOne } from '@/lib/portal/db'
import { audit } from '@/lib/audit'

export async function updateContactStatus(raw: unknown) {
  return run(async () => {
    const actor = await requireStaff('leads:manage')
    const input = z.object({ id: z.string().uuid(), status: z.enum(['new', 'contacted', 'resolved', 'dismissed']) }).parse(raw)
    const updated = await queryOne<{ id: string; status: string; intent: string; company: string }>(
      `update public.contact_submissions set status = $2, updated_at = now() where id = $1 returning id, status, intent, company`,
      [input.id, input.status],
    )
    if (!updated) throw new Err('Request not found.', 'not_found')
    await audit(actor, null, 'enquiry.status', updated.company, { id: updated.id, intent: updated.intent, status: updated.status })
    return { ok: true }
  })
}
