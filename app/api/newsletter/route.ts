import { NextResponse } from 'next/server'

/**
 * POST /api/newsletter
 * T57: Newsletter signup endpoint. Currently a stub — wire to an ESP
 * (Mailchimp, ConvertKit, etc.) when Kerem provides API credentials.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const email = formData.get('email')

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    // TODO (KEREM-STEP): replace stub with ESP integration.
    // Example: await subscribeToMailchimp(email)
    console.log('[newsletter] signup:', email)

    // Redirect back with success indicator
    const referer = request.headers.get('referer') ?? '/'
    const redirectUrl = new URL(referer)
    redirectUrl.searchParams.set('subscribed', '1')
    return NextResponse.redirect(redirectUrl.toString(), { status: 303 })
  } catch {
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
  }
}
