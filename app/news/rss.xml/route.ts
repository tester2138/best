import { NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/site'

export function GET() {
  return NextResponse.redirect(`${SITE_URL}/news/feed.xml`, { status: 308 })
}
