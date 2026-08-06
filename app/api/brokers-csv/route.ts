import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const filePath = join(process.cwd(), 'public', 'bestforex-brokers.csv')
  const csv = readFileSync(filePath, 'utf8')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bestforex-brokers.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
