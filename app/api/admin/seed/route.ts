import { NextRequest, NextResponse } from 'next/server'
import { seedDatabase } from '@/lib/db-seed'

// This is a one-time initialization endpoint - in production, use proper database migrations
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authorization check here
    const success = await seedDatabase()

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Database seeded successfully',
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to seed database' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[v0] Seed error:', error)
    return NextResponse.json(
      { error: 'Seeding failed' },
      { status: 500 }
    )
  }
}
