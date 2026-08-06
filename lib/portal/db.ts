import 'server-only'
import { Pool, type PoolClient } from 'pg'

/**
 * Portal database access.
 *
 * The legacy site uses @neondatabase/serverless (HTTP) for its read-heavy
 * broker/news queries — that stays untouched. The portal needs a real `pg`
 * Pool because Better Auth manages users/sessions through one, and sharing a
 * single Pool keeps one connection and one source of truth (per the Neon +
 * Better Auth stack). All portal reads/writes go through this Pool with
 * parameterized queries — never string interpolation.
 */

declare global {
  // eslint-disable-next-line no-var
  var __portalPool: Pool | undefined
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — the portal database is unavailable.')
  }
  if (!global.__portalPool) {
    global.__portalPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
    })
  }
  return global.__portalPool
}

/** Run a parameterized query and return typed rows. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query(text, params as never[])
  return res.rows as T[]
}

/** Return the first row or null. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

/**
 * Run a set of statements inside a single transaction. The callback receives a
 * dedicated client; the Pool client is always released. Used by version-safe
 * publish/save flows (optimistic locking) in Step 8.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* ignore rollback failure — surface the original error */
    }
    throw err
  } finally {
    client.release()
  }
}
