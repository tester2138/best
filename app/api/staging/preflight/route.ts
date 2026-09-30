import { NextResponse } from 'next/server'
import { verifyDatabaseIdentity } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const responseHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ status: 'unavailable' }, { status: 404, headers: responseHeaders })
  }

  try {
    const identity = await verifyDatabaseIdentity()
    if (identity.environment !== 'staging' || !identity.markerVerified) {
      return NextResponse.json(
        { status: 'blocked', reason: 'staging_identity_not_verified' },
        { status: 503, headers: responseHeaders },
      )
    }

    return NextResponse.json(
      {
        status: 'ready',
        runtimeEnvironment: identity.runtimeEnvironment,
        database: {
          environment: identity.environment,
          host: identity.host,
          databaseName: identity.databaseName,
          markerVerified: identity.markerVerified,
          projectId: identity.projectId,
          branchId: identity.branchId,
          endpointId: identity.endpointId,
        },
        services: {
          blobToken: process.env.BLOB_READ_WRITE_TOKEN ? 'configured' : 'missing',
          emailDelivery: 'disabled',
          emailTestSink: 'not_configured',
        },
      },
      { headers: responseHeaders },
    )
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'staging_preflight_failed'
    return NextResponse.json(
      { status: 'blocked', reason },
      { status: 503, headers: responseHeaders },
    )
  }
}
