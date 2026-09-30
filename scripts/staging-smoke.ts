import { randomBytes, randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { STAGING_BLOB_STORE_ID, resolveBlobStorageIdentity } from '../lib/blob-storage-safety'
import { STAGING_DATABASE_IDENTITY } from '../lib/database-safety'

const adminEmail = 'preview-smoke-admin@bestforex.test'
const fixtureBrandSlug = 'forex-com'

type Preflight = {
  status: string
  runtimeEnvironment: string
  database: {
    environment: string
    markerVerified: boolean
  }
  services: {
    blobToken: string
    blobEnvironment: string
    emailDelivery: string
    emailTestSink: string
  }
}

type CreatedUser = {
  email: string
  password: string
}

function makeCookie(response: Response): string {
  const cookieHeaders = response.headers as Headers & { getSetCookie?: () => string[] }
  const setCookies = cookieHeaders.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? '']
  return setCookies
    .map((header) => header.split(';', 1)[0])
    .filter(Boolean)
    .join('; ')
}

async function cleanupUser(
  email: string,
  query: (text: string, params?: unknown[]) => Promise<unknown>,
  queryOne: <T>(text: string, params?: unknown[]) => Promise<T | null>,
): Promise<void> {
  const user = await queryOne<{ id: string }>(
    `SELECT id FROM public."user" WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  )
  if (!user) return

  await query(`DELETE FROM public.brand_members WHERE user_id = $1`, [user.id])
  await query(`DELETE FROM public.invitations WHERE email = $1`, [email])
  await query(`DELETE FROM public.session WHERE "userId" = $1`, [user.id])
  await query(`DELETE FROM public.account WHERE "userId" = $1`, [user.id])
  await query(`DELETE FROM public.verification WHERE identifier = $1`, [email])
  await query(`DELETE FROM public.profiles WHERE id = $1`, [user.id])
  await query(`DELETE FROM public."user" WHERE id = $1`, [user.id])
}

async function requestLogin(previewOrigin: string, user: CreatedUser): Promise<string> {
  const response = await fetch(`${previewOrigin}/api/auth/sign-in/email`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/json',
      origin: previewOrigin,
    },
    body: JSON.stringify({ email: user.email, password: user.password }),
  })
  assert.equal(response.ok, true, `Preview sign-in failed with HTTP ${response.status}.`)

  const cookie = makeCookie(response)
  assert.ok(cookie, 'Preview sign-in did not return an authentication cookie.')
  return cookie
}

async function assertSession(
  previewOrigin: string,
  cookie: string,
  expectedEmail: string,
): Promise<void> {
  const response = await fetch(`${previewOrigin}/api/auth/get-session`, {
    headers: { cookie, origin: previewOrigin },
    cache: 'no-store',
  })
  assert.equal(response.ok, true, `Session check failed with HTTP ${response.status}.`)
  const payload = (await response.json()) as { user?: { email?: string } } | null
  assert.equal(payload?.user?.email?.toLowerCase(), expectedEmail.toLowerCase())
}

async function signOut(previewOrigin: string, cookie: string): Promise<void> {
  const response = await fetch(`${previewOrigin}/api/auth/sign-out`, {
    method: 'POST',
    headers: { cookie, origin: previewOrigin },
  })
  assert.equal(response.ok, true, `Preview sign-out failed with HTTP ${response.status}.`)
}

async function main() {
  const previewUrl = process.argv[2]
  assert.ok(previewUrl, 'Pass the isolated Vercel Preview URL as the first argument.')
  const preview = new URL(previewUrl)
  assert.equal(preview.protocol, 'https:', 'The staging smoke suite only targets an HTTPS Preview URL.')
  assert.notEqual(process.env.VERCEL_ENV, 'production', 'The smoke suite refuses Production.')

  const preflightResponse = await fetch(new URL('/api/staging/preflight', preview.origin), {
    redirect: 'manual',
    cache: 'no-store',
  })
  assert.equal(
    preflightResponse.ok,
    true,
    `Side-effect-free Preview preflight failed with HTTP ${preflightResponse.status}; no test writes were attempted.`,
  )
  const preflight = (await preflightResponse.json()) as Preflight
  assert.equal(preflight.status, 'ready')
  assert.equal(preflight.runtimeEnvironment, 'preview')
  assert.equal(preflight.database.environment, 'staging')
  assert.equal(preflight.database.markerVerified, true)
  assert.equal(preflight.services.blobToken, 'verified')
  assert.equal(preflight.services.blobEnvironment, 'staging')
  assert.equal(preflight.services.emailDelivery, 'disabled')
  assert.ok(process.env.DATABASE_URL, 'Pull the isolated Preview environment before running this suite.')
  assert.ok(process.env.BLOB_READ_WRITE_TOKEN, 'The isolated Preview Blob token is required.')

  process.env.VERCEL_ENV = 'preview'
  process.env.VERCEL_URL = preview.host
  process.env.BETTER_AUTH_URL = preview.origin
  process.env.ADMIN_EMAILS = adminEmail
  process.env.FORCE_PASSWORD_CHANGE = 'false'
  const blobIdentity = resolveBlobStorageIdentity()
  assert.equal(blobIdentity.environment, 'staging')
  assert.equal(blobIdentity.storeId, STAGING_BLOB_STORE_ID)

  const [{ verifyDatabaseIdentity }, { auth }, { allowAccountCreation }, { query, queryOne }] =
    await Promise.all([
      import('../lib/db'),
      import('../lib/auth'),
      import('../lib/portal/creation-context'),
      import('../lib/portal/db'),
    ])

  const identity = await verifyDatabaseIdentity()
  assert.equal(identity.environment, 'staging')
  assert.equal(identity.markerVerified, true)
  assert.equal(identity.branchId, STAGING_DATABASE_IDENTITY.branchId)

  const admin: CreatedUser = {
    email: adminEmail,
    password: randomBytes(32).toString('base64url'),
  }
  const merchant: CreatedUser = {
    email: `preview-smoke-${randomUUID()}@example.invalid`,
    password: randomBytes(32).toString('base64url'),
  }
  let adminCookie = ''
  let merchantCookie = ''

  try {
    await cleanupUser(admin.email, query, queryOne)

    const adminResult = await auth.api.signUpEmail({
      body: { email: admin.email, password: admin.password, name: 'Preview Smoke Admin' },
      headers: new Headers({ origin: preview.origin }),
    })
    assert.ok(adminResult.user?.id, 'Staging admin account was not created.')

    const merchantResult = await allowAccountCreation(() =>
      auth.api.signUpEmail({
        body: { email: merchant.email, password: merchant.password, name: 'Preview Smoke Merchant' },
        headers: new Headers({ origin: preview.origin }),
      }),
    )
    assert.ok(merchantResult.user?.id, 'Staging merchant account was not created.')

    const brand = await queryOne<{ id: string }>(
      `SELECT id FROM public.brands WHERE slug = $1 LIMIT 1`,
      [fixtureBrandSlug],
    )
    assert.ok(brand?.id, `Staging public fixture brand ${fixtureBrandSlug} was not found.`)
    await query(
      `INSERT INTO public.brand_members (brand_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [brand.id, merchantResult.user.id],
    )
    await query(`UPDATE public.profiles SET must_change_password = false WHERE id = $1`, [
      merchantResult.user.id,
    ])

    adminCookie = await requestLogin(preview.origin, admin)
    await assertSession(preview.origin, adminCookie, admin.email)

    const adminSmoke = await fetch(`${preview.origin}/api/staging/smoke`, {
      method: 'POST',
      headers: { cookie: adminCookie, origin: preview.origin },
    })
    assert.equal(adminSmoke.ok, true, `Admin staging smoke failed with HTTP ${adminSmoke.status}.`)
    const adminSmokePayload = (await adminSmoke.json()) as {
      status: string
      database: string
      blob: string
      emailDelivery: string
    }
    assert.deepEqual(adminSmokePayload, {
      status: 'passed',
      database: 'insert_read_delete',
      blob: 'upload_delete',
      emailDelivery: 'disabled',
    })

    merchantCookie = await requestLogin(preview.origin, merchant)
    await assertSession(preview.origin, merchantCookie, merchant.email)
    const merchantPage = await fetch(`${preview.origin}/business`, {
      headers: { cookie: merchantCookie },
      redirect: 'manual',
    })
    assert.equal(merchantPage.status, 200, `Merchant portal returned HTTP ${merchantPage.status}.`)

    await signOut(preview.origin, adminCookie)
    adminCookie = ''
    await signOut(preview.origin, merchantCookie)
    merchantCookie = ''

    console.log('PASS: isolated Preview preflight and staging marker verified.')
    console.log('PASS: disposable admin and merchant login/session smoke checks.')
    console.log('PASS: protected admin smoke route performed staging insert/read/delete and Blob upload/delete.')
    console.log('BLOCKED: mail delivery test sink is not configured; no mail was sent.')
  } finally {
    await cleanupUser(merchant.email, query, queryOne)
    await cleanupUser(admin.email, query, queryOne)
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown staging smoke failure.'
  console.error(`Staging smoke stopped: ${message}`)
  process.exitCode = 1
})
