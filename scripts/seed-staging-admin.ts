/**
 * Seeds a staging-only staff admin for local/preview testing of the admin
 * panel. NEVER run against production: it creates a real super-admin account
 * with a known password.
 *
 * Usage: pnpm exec tsx scripts/seed-staging-admin.ts
 *
 * Credentials (staging only):
 *   email:    staging-admin@bestforex.io
 *   password: StagingAdmin2026!x
 */
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'

// Direct file imports: the better-auth exports map blocks subpath imports.
async function loadAuthCrypto() {
  return import(
    new URL('../node_modules/better-auth/dist/crypto/index.mjs', import.meta.url).href
  )
}

const EMAIL = 'staging-admin@bestforex.io'
const PASSWORD = 'StagingAdmin2026!x'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const { hashPassword } = await loadAuthCrypto()
  const hashed = await hashPassword(PASSWORD)
  const client = await pool.connect()
  try {
    await client.query('begin')
    const existing = await client.query<{ id: string }>(`select id from public."user" where email = $1`, [EMAIL])
    let userId: string
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id
      await client.query(`update public."user" set "twoFactorEnabled" = false where id = $1`, [userId])
      console.log(`[v0] reusing existing user ${userId}`)
    } else {
      userId = randomUUID()
      await client.query(
        `insert into public."user" (id, name, email, "emailVerified", "twoFactorEnabled", "createdAt", "updatedAt")
         values ($1, $2, $3, false, false, now(), now())`,
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

    await client.query(`delete from public."twoFactor" where "userId" = $1`, [userId])

    await client.query('commit')
    console.log('[v0] staging admin ready:')
    console.log('[v0]   email:', EMAIL)
    console.log('[v0]   password:', PASSWORD)
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
