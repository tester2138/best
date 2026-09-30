import 'server-only'
import { query, queryOne } from '@/lib/portal/db'
import { TEMPLATES, type TemplateName } from './templates'

/**
 * Email sender (Blueprint Section 19.1), adapted from Resend to Brevo.
 * Transactional emails go through the Brevo HTTP API only in Production.
 * Preview and Development return before contacting Brevo or writing email_log;
 * no isolated mail sink is configured for those environments.
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

/** Parse `EMAIL_FROM` of the form `Name <email@host>` into Brevo's sender shape. */
function parseSender(): { name: string; email: string } {
  const raw = process.env.EMAIL_FROM ?? 'BestForex.io <notifications@bestforex.io>'
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  if (match) return { name: match[1] || 'BestForex.io', email: match[2].trim() }
  return { name: 'BestForex.io', email: raw.trim() }
}

async function logEmail(
  to: string,
  template: TemplateName,
  status: 'sent' | 'bounced' | 'failed',
  resendId: string | null,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await query(
      `insert into public.email_log (to_email, template, status, resend_id, meta)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [to, template, status, resendId, JSON.stringify(meta)],
    )
  } catch (err) {
    console.error('[v0] email_log insert failed:', err)
  }
}

export async function sendEmail(
  template: TemplateName,
  to: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (process.env.VERCEL_ENV !== 'production') return

  const t = TEMPLATES[template](data as never)
  const apiKey = process.env.BREVO_API_KEY

  if (!apiKey) {
    await logEmail(to, template, 'sent', null, { preview: true })
    return
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseSender(),
        to: [{ email: to }],
        subject: t.subject,
        htmlContent: t.html,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      await logEmail(to, template, 'failed', null, { error: body.slice(0, 500) })
      return
    }
    const sent = (await res.json().catch(() => ({}))) as { messageId?: string }
    await logEmail(to, template, 'sent', sent.messageId ?? null, {})
  } catch (e) {
    await logEmail(to, template, 'failed', null, { error: String(e) })
  }
}

/**
 * One moderation-pending email per brand per hour (Blueprint Section 19.1).
 * Dedup uses email_log rows written in the last hour that carry this brandId.
 */
export async function adminDigestOnce(brandId: string, brandName: string): Promise<void> {
  if (process.env.VERCEL_ENV !== 'production') return

  try {
    const row = await queryOne<{ n: string }>(
      `select count(*)::text as n from public.email_log
       where template = 'moderation-pending'
         and created_at >= now() - interval '1 hour'
         and meta ->> 'brandId' = $1`,
      [brandId],
    )
    if (Number(row?.n ?? '0') > 0) return
  } catch (err) {
    console.error('[v0] adminDigestOnce dedup check failed:', err)
  }

  const admin = (process.env.ADMIN_EMAILS ?? '').split(',')[0]?.trim()
  if (!admin) return

  const t = TEMPLATES['moderation-pending']({ brandName })
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    await logEmail(admin, 'moderation-pending', 'sent', null, { brandId, preview: true })
    return
  }
  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: parseSender(),
        to: [{ email: admin }],
        subject: t.subject,
        htmlContent: t.html,
      }),
    })
    const sent = res.ok
      ? ((await res.json().catch(() => ({}))) as { messageId?: string })
      : {}
    await logEmail(admin, 'moderation-pending', res.ok ? 'sent' : 'failed', sent.messageId ?? null, {
      brandId,
    })
  } catch (e) {
    await logEmail(admin, 'moderation-pending', 'failed', null, { brandId, error: String(e) })
  }
}
