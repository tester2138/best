import 'server-only'
import { Pool, type PoolClient } from 'pg'
import {
  assertStagingDatabaseMarker,
  resolveDatabaseTarget,
  type StagingDatabaseMarker,
} from '@/lib/database-safety'

/**
 * Portal database access.
 *
 * Better Auth and all portal reads/writes share one pg Pool. Preview and
 * development queries verify the provider-pinned staging marker before the
 * first operation; the URL host is checked before the Pool is created.
 */

declare global {
  // eslint-disable-next-line no-var
  var __portalPool: Pool | undefined
  // eslint-disable-next-line no-var
  var __portalPoolConnectionString: string | undefined
}

const STAGING_MARKER_QUERY = `
  SELECT environment, neon_project_id, neon_branch_id, neon_endpoint_id,
         database_name, current_database() AS connected_database
  FROM public.preview_environment
  WHERE id = 1
`

function createGuardedPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
  })
  const rawQuery = pool.query.bind(pool)
  const rawConnect = pool.connect.bind(pool)
  let identityCheck: Promise<void> | null = null

  function verifyIdentity(): Promise<void> {
    const target = resolveDatabaseTarget()
    if (target.environment === 'production') return Promise.resolve()

    if (!identityCheck) {
      identityCheck = rawQuery(STAGING_MARKER_QUERY)
        .then((result) => {
          assertStagingDatabaseMarker(
            result.rows[0] as StagingDatabaseMarker | undefined,
          )
        })
        .catch((error) => {
          identityCheck = null
          throw error
        })
    }
    return identityCheck
  }

  const guardedQuery = ((...args: unknown[]) =>
    verifyIdentity().then(() =>
      (rawQuery as (...queryArgs: unknown[]) => unknown)(...args),
    )) as Pool['query']
  const guardedConnect = ((...args: unknown[]) =>
    verifyIdentity().then(() =>
      (rawConnect as (...connectArgs: unknown[]) => unknown)(...args),
    )) as Pool['connect']

  return new Proxy(pool, {
    get(target, property) {
      if (property === 'query') return guardedQuery
      if (property === 'connect') return guardedConnect
      const value = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

export function getPool(): Pool {
  const target = resolveDatabaseTarget()
  if (
    global.__portalPool &&
    global.__portalPoolConnectionString !== target.connectionString
  ) {
    throw new Error('Database connection configuration changed; restart the server process.')
  }

  if (!global.__portalPool) {
    global.__portalPool = createGuardedPool(target.connectionString)
    global.__portalPoolConnectionString = target.connectionString
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
 * dedicated client; the Pool client is always released.
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
