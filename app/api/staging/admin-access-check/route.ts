import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { allowAccountCreation } from '@/lib/portal/creation-context'
import { query, queryOne, withTransaction } from '@/lib/portal/db'
import { verifyDatabaseIdentity } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const testEmails = [
  'admin-access-verification-20261002@bestforex.test',
  'admin-access-managed-20261002@bestforex.test',
]
const bootstrapEmail = testEmails[0]

async function guard(request: Request) {
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.VERCEL_ENV === 'production' ||
    request.headers.get('origin') !== 'http://localhost:3000'
  ) {
    return NextResponse.json({ status: 'unavailable' }, { status: 404 })
  }

  try {
    const identity = await verifyDatabaseIdentity()
    if (identity.environment === 'staging' && identity.markerVerified) return null
  } catch {
    // Fail closed when the pinned staging identity cannot be verified.
  }

  return NextResponse.json({ status: 'staging_identity_unverified' }, { status: 503 })
}

export async function GET(request: Request) {
  const blocked = await guard(request)
  if (blocked) return blocked

  const users = await query<{
    id: string
    email: string
    role: string
    session_count: number
  }>(
    `select p.id, lower(p.email) as email, p.role,
            count(s.id)::int as session_count
       from public.profiles p
       left join public.session s on s."userId" = p.id
      where lower(p.email) = any($1::text[])
      group by p.id, p.email, p.role
      order by lower(p.email)`,
    [testEmails],
  )

  return NextResponse.json({ users }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const blocked = await guard(request)
  if (blocked) return blocked

  const body = (await request.json().catch(() => null)) as {
    email?: unknown
    password?: unknown
    name?: unknown
  } | null
  if (
    body?.email !== bootstrapEmail ||
    typeof body.password !== 'string' ||
    body.password.length < 12 ||
    typeof body.name !== 'string'
  ) {
    return NextResponse.json({ status: 'invalid_test_account' }, { status: 400 })
  }

  const existing = await queryOne<{ id: string }>(
    `select id from public."user" where lower(email) = $1`,
    [bootstrapEmail],
  )
  if (existing) return NextResponse.json({ status: 'test_account_already_exists' }, { status: 409 })

  const created = await allowAccountCreation(() =>
    auth.api.signUpEmail({
      body: { email: bootstrapEmail, password: body.password as string, name: body.name as string },
      headers: new Headers({ origin: 'http://localhost:3000' }),
    }),
  )
  const userId = created.user?.id
  if (!userId) return NextResponse.json({ status: 'account_creation_failed' }, { status: 500 })

  const profile = await queryOne<{ id: string }>(
    `update public.profiles
        set role = 'admin', must_change_password = false, updated_at = now()
      where id = $1
      returning id`,
    [userId],
  )
  if (!profile) return NextResponse.json({ status: 'profile_setup_failed' }, { status: 500 })

  return NextResponse.json({ status: 'ready' }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(request: Request) {
  const blocked = await guard(request)
  if (blocked) return blocked

  const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null
  if (body?.confirm !== 'delete-admin-access-test-users') {
    return NextResponse.json({ status: 'cleanup_not_confirmed' }, { status: 400 })
  }

  await withTransaction(async (client) => {
    const users = await client.query<{ id: string }>(
      `select id from public."user" where lower(email) = any($1::text[])`,
      [testEmails],
    )
    await client.query(
      `delete from public.audit_log
        where lower(coalesce(actor_email, '')) = any($1::text[])
           or lower(coalesce(target, '')) = any($1::text[])`,
      [testEmails],
    )

    for (const user of users.rows) {
      await client.query(`delete from public.staff_brand_scopes where user_id = $1`, [user.id])
      await client.query(`delete from public.staff_access where user_id = $1`, [user.id])
      await client.query(`delete from public.staff_invitations where lower(email) = any($1::text[])`, [testEmails])
      await client.query(`delete from public.brand_members where user_id = $1`, [user.id])
      await client.query(`delete from public.invitations where lower(email) = any($1::text[])`, [testEmails])
      await client.query(`delete from public.session where "userId" = $1`, [user.id])
      await client.query(`delete from public.account where "userId" = $1`, [user.id])
      await client.query(`delete from public.verification where lower(identifier) = any($1::text[])`, [testEmails])
      await client.query(`delete from public.profiles where id = $1`, [user.id])
      await client.query(`delete from public."user" where id = $1`, [user.id])
    }
  })

  const remaining = await queryOne<{ count: string }>(
    `select count(*)::text as count from public."user" where lower(email) = any($1::text[])`,
    [testEmails],
  )
  if (remaining?.count !== '0') {
    return NextResponse.json({ status: 'cleanup_unconfirmed' }, { status: 503 })
  }

  return NextResponse.json({ status: 'cleaned' }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, POST, DELETE, OPTIONS' } })
}

export async function HEAD(request: Request) {
  return guard(request) ?? new NextResponse(null, { status: 204 })
}
