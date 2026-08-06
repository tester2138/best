import { NextRequest, NextResponse } from 'next/server'
import { subscribeToNewsletter } from '@/lib/queries'
import { initializeDatabase } from '@/lib/db-init'

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase()

    const body = await request.json()
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    await subscribeToNewsletter(email)

    return NextResponse.json({
      success: true,
      message: 'Subscription successful',
    })
  } catch (error) {
    console.error('[v0] Newsletter API error:', error)
    return NextResponse.json(
      { error: 'Subscription failed' },
      { status: 500 }
    )
  }
}
