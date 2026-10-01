/**
 * Seeds a staging-only staff admin for local/preview testing of the admin
 * panel. NEVER run against production: it creates a real super-admin account
 * with a known password and a known TOTP secret.
 *
 * Usage: pnpm exec tsx scripts/seed-staging-admin.ts
 *
 * Credentials (staging only):
 *   email:    staging-admin@bestforex.io
 *   password: StagingAdmin2026!x
 *   TOTP:     secret printed below; compute codes with
 *             `pnpm exec tsx scripts/seed-staging-admin.ts --code`
 */
import { randomUUID, createHmac } from 'node:crypto'
import { Pool } from 'pg'

// Direct file imports: the better-auth exports map blocks subpath imports.
async function loadAuthCrypto() {
  return import(
    new URL('../node_modules/better-auth/dist/crypto/index.mjs', import.meta.url).href
  )
}

const EMAIL = 'staging-admin@bestforex.io'
const PASSWORD = 'StagingAdmin2026!x'
// Known staging TOTP secret.
const TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'

function totpCode(secret: string, timeStep = Math.floor(Date.now() / 30000)): string {
  const key = Buffer.from(secret, 'utf8')
  const counter = Buffer.alloc(8)
  counter.writeUInt32BE(Math.floor(timeStep / 2 ** 32), 0)
  counter.writeUInt32BE(timeStep % 2 ** 32, 4)
  const digest = createHmac('sha1', key).update(counter).digest()
  const offset = digest[digest.length - 1] & 0xf
  const code = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3]
  return String(code % 1_000_000).padStart(6, '0')
}

if (process.argv.includes('--code')) {
  console.log(totpCode(TOTP_SECRET))
  process.exit(0)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const { hashPassword, symmetricEncrypt } = await loadAuthCrypto()
  const hashed = await hashPassword(PASSWORD)
  // Better Auth stores the TOTP secret encrypted with the auth secret
  // (symmetricEncrypt with key = BETTER_AUTH_SECRET, bare hex when no
  // BETTER_AUTH_SECRETS array is configured).
  const encryptedTotpSecret = await symmetricEncrypt({
    key: process.env.BETTER_AUTH_SECRET!,
    data: TOTP_SECRET,
  })
  const client = await pool.connect()
  try {
    await client.query('begin')
    const existing = await client.query<{ id: string }>(`select id from public."user" where email = $1`, [EMAIL])
    let userId: string
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id
      await client.query(`update public."user" set "twoFactorEnabled" = true where id = $1`, [userId])
      console.log(`[v0] reusing existing user ${userId}`)
    } else {
      userId = randomUUID()
      await client.query(
        `insert into public."user" (id, name, email, "emailVerified", "twoFactorEnabled", "createdAt", "updatedAt")
         values ($1, $2, $3, false, true, now(), now())`,
        [userId, 'Staging Admin', EMAIL],
      )
    }

    // Password credential row (Better Auth account table, providerId=credential).
    const account = await client.query(`select id from public.account where "userId" = $1 and "providerId" = 'credential'`, [userId])
    if (account.rows.length === 0) {
      await client.query(
        `insert into public.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values ($1, $2, 'credential', $3, $4, now(), now())`,
        [randomUUID(), userId, userId, hashed],
      )
    } else {
      await client.query(`update public.account set password = $2 where id = $1`, [account.rows[0].id, hashed])
    }

    // Super-admin profile.
    await client.query(
      `insert into public.profiles (id, email, full_name, role, must_change_password)
       values ($1, $2, 'Staging Admin', 'admin', false)
       on conflict (id) do update set role = 'admin', must_change_password = false`,
      [userId, EMAIL],
    )

    // Verified TOTP factor with the known staging secret.
    await client.query(`delete from public."twoFactor" where "userId" = $1`, [userId])
    await client.query(
      `insert into public."twoFactor" (id, "userId", secret, "backupCodes", verified, "failedVerificationCount", "createdAt", "updatedAt")
       values ($1, $2, $3, '[]', true, 0, now(), now())`,
      [randomUUID(), userId, encryptedTotpSecret],
    )

    await client.query('commit')
    console.log('[v0] staging admin ready:')
    console.log('[v0]   email:', EMAIL)
    console.log('[v0]   password:', PASSWORD)
    console.log('[v0]   totp secret:', TOTP_SECRET)
    console.log('[v0]   current code:', totpCode(TOTP_SECRET))
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[v0] seed failed:', err)
  process.exit(1)
})
