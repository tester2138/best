import 'server-only'

/**
 * Cloudflare Turnstile verification (Blueprint Section 10).
 * No-op when TURNSTILE_SECRET_KEY is absent, so the portal works without bot
 * protection configured and transparently enforces it once keys are added.
 */
export async function verifyTurnstile(token: FormDataEntryValue | null): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return // not configured — skip silently

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: typeof token === 'string' ? token : '' }),
  })
  const data = (await res.json()) as { success?: boolean }
  if (!data.success) {
    throw new Error('Bot verification failed. Please try again.')
  }
}

/** Public site key for the client widget (undefined when not configured). */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
