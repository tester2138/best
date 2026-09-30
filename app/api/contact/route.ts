import { NextResponse } from 'next/server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { query } from '@/lib/portal/db'
import { rateLimit } from '@/lib/rate'

const ContactInput = z.object({
  intent: z.enum(['claim', 'partnership', 'advertising', 'general']),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  company: z.string().trim().min(1).max(160),
  website: z.string().trim().max(300).optional().or(z.literal('')),
  phone: z.string().trim().max(80).optional().or(z.literal('')),
  message: z.string().trim().min(1).max(5000),
  details: z.record(z.string().max(500)).default({}),
})

export async function POST(request: Request) {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!(await rateLimit('claim', ip)).ok) {
    return NextResponse.json({ error: 'Too many requests. Try again tomorrow.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const parsed = ContactInput.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Check the required fields and try again.' }, { status: 400 })
  }

  const { intent, firstName, lastName, email, company, website, phone, message, details } = parsed.data
  await query(
    `insert into public.contact_submissions
       (intent, full_name, work_email, company, website, phone, message, details)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [intent, `${firstName} ${lastName}`, email.toLowerCase(), company, website || null, phone || null, message, JSON.stringify(details)],
  )
  return NextResponse.json({ ok: true }, { status: 201 })
}
