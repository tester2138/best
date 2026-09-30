'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { run, Err } from '@/lib/portal/result'
import { requireStaff } from '@/lib/guards'
import { query, queryOne } from '@/lib/portal/db'
import { rateLimit } from '@/lib/rate'
import { audit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/send'

/* ── Public: submit a claim request (Blueprint Section 13) ────────────────── */

const ClaimInput = z.object({
  slug: z.string().trim().min(1).max(200),
  brokerName: z.string().trim().min(1).max(200).optional().default(''),
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  workEmail: z.string().trim().email('Enter a valid work email').max(200),
  message: z.string().trim().max(1000).optional().default(''),
})

export async function submitClaim(raw: unknown) {
  return run(async () => {
    const input = ClaimInput.parse(raw)
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!(await rateLimit('claim', ip)).ok)
      throw new Err('Too many claim requests. Please try again tomorrow.', 'rate_limited')

    // claim_requests.brand_id is NOT NULL, so ensure a brand row exists for the
    // slug. Unclaimed brokers get a shell row (is_claimed = false) which stays
    // invisible on the public page until an admin assigns it — getClaimedData()
    // returns null for un-actioned shells (Blueprint Section 15.4).
    const derivedName = input.brokerName || input.slug
    const brand = await queryOne<{ id: string; name: string }>(
      `insert into public.brands (slug, name, is_claimed)
       values ($1, $2, false)
       on conflict (slug) do update set updated_at = now()
       returning id, name`,
      [input.slug, derivedName],
    )
    const brandId = brand!.id

    await query(
      `insert into public.claim_requests (brand_id, full_name, work_email, message, status, ip)
       values ($1, $2, $3, $4, 'new', $5)`,
      [brandId, input.fullName, input.workEmail, input.message, ip],
    )

    await audit(
      { id: null, email: input.workEmail },
      brandId,
      'claim.received',
      input.slug,
      { fullName: input.fullName },
    )

    const adminEmail = (process.env.ADMIN_EMAILS ?? '').split(',')[0]?.trim()
    if (adminEmail)
      await sendEmail('claim-received', adminEmail, {
        brandName: brand!.name,
        slug: input.slug,
        fullName: input.fullName,
        workEmail: input.workEmail,
        message: input.message,
      })

    return {}
  })
}

/* ── Admin: update a lead's status ────────────────────────────────────────── */

const StatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'contacted', 'assigned', 'dismissed']),
})

export async function setClaimStatus(raw: unknown) {
  return run(async () => {
    const input = StatusInput.parse(raw)
    const admin = await requireStaff('leads:manage')
    const updated = await queryOne<{ id: string }>(
      `update public.claim_requests set status = $2 where id = $1 returning id`,
      [input.id, input.status],
    )
    if (!updated) throw new Err('Lead not found', 'not_found')
    await audit(admin, null, 'claim.received', input.id, { status: input.status })
    return {}
  })
}
