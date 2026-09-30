import { Pool } from 'pg'

async function main() {
  const { symmetricDecrypt } = await import(
    new URL('../node_modules/better-auth/dist/crypto/index.mjs', import.meta.url).href
  )

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const r = await pool.query(`select secret from public."twoFactor" limit 1`)
  console.log('[v0] stored prefix:', r.rows[0].secret.slice(0, 40))
  try {
    const plain = await symmetricDecrypt({
      key: process.env.BETTER_AUTH_SECRET!,
      data: r.rows[0].secret,
    })
    console.log('[v0] decrypted:', plain)
  } catch (e) {
    console.log('[v0] decrypt failed:', e instanceof Error ? e.message : e)
  }
  await pool.end()
}

main()
