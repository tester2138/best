import { del, put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { sql, verifyDatabaseIdentity } from '@/lib/db'
import { requireAdmin } from '@/lib/guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const responseHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

export async function POST() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ status: 'unavailable' }, { status: 404, headers: responseHeaders })
  }

  let checkId: string | undefined
  let blobUrl: string | undefined
  let succeeded = false
  let cleanupFailed = false

  try {
    const identity = await verifyDatabaseIdentity()
    if (identity.environment !== 'staging' || !identity.markerVerified) {
      return NextResponse.json(
        { status: 'blocked', reason: 'staging_identity_not_verified' },
        { status: 503, headers: responseHeaders },
      )
    }

    try {
      await requireAdmin()
    } catch {
      return NextResponse.json({ status: 'unavailable' }, { status: 404, headers: responseHeaders })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { status: 'blocked', reason: 'isolated_blob_token_missing' },
        { status: 503, headers: responseHeaders },
      )
    }

    const checkName = `preview-smoke:${crypto.randomUUID()}`
    const inserted = await sql`
      INSERT INTO public.preview_smoke_checks (check_name)
      VALUES (${checkName})
      RETURNING id
    `
    checkId = String(inserted[0]?.id ?? '') || undefined
    if (!checkId) throw new Error('smoke_insert_failed')

    const selected = await sql`
      SELECT check_name
      FROM public.preview_smoke_checks
      WHERE id = ${checkId}::uuid
    `
    if (selected[0]?.check_name !== checkName) throw new Error('smoke_read_failed')

    const blob = await put(
      `staging-smoke/${identity.branchId}/${crypto.randomUUID()}.txt`,
      new Blob(['BestForex staging smoke check'], { type: 'text/plain' }),
      { access: 'public', addRandomSuffix: false, contentType: 'text/plain' },
    )
    blobUrl = blob.url
    await del(blob.url)
    blobUrl = undefined
    succeeded = true
  } catch (error) {
    console.error(
      '[staging-smoke] check failed:',
      error instanceof Error ? error.name : 'unknown_error',
    )
  } finally {
    if (blobUrl) {
      try {
        await del(blobUrl)
      } catch {
        cleanupFailed = true
      }
    }
    if (checkId) {
      try {
        await sql`DELETE FROM public.preview_smoke_checks WHERE id = ${checkId}::uuid`
      } catch {
        cleanupFailed = true
      }
    }
  }

  if (!succeeded || cleanupFailed) {
    return NextResponse.json(
      {
        status: 'blocked',
        reason: cleanupFailed ? 'staging_cleanup_unconfirmed' : 'staging_smoke_failed',
      },
      { status: 503, headers: responseHeaders },
    )
  }

  return NextResponse.json(
    {
      status: 'passed',
      database: 'insert_read_delete',
      blob: 'upload_delete',
      emailDelivery: 'disabled',
    },
    { headers: responseHeaders },
  )
}
