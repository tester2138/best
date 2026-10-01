import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import {
  assertStagingDatabaseMarker,
  resolveDatabaseTarget,
  type StagingDatabaseMarker,
  type VerifiedDatabaseIdentity,
} from './database-safety'

let _sql: NeonQueryFunction<false, false> | null = null
let _connectionString: string | null = null
let _identityCheck: {
  key: string
  promise: Promise<VerifiedDatabaseIdentity>
} | null = null

function getSql(): NeonQueryFunction<false, false> {
  const target = resolveDatabaseTarget()
  if (_sql && _connectionString !== target.connectionString) {
    throw new Error('Database connection configuration changed; restart the server process.')
  }
  if (!_sql) {
    _sql = neon(target.connectionString)
    _connectionString = target.connectionString
  }
  return _sql
}

export async function verifyDatabaseIdentity(): Promise<VerifiedDatabaseIdentity> {
  const target = resolveDatabaseTarget()
  if (target.environment === 'production') {
    return {
      environment: 'production',
      runtimeEnvironment: target.runtimeEnvironment,
      host: target.host,
      databaseName: target.databaseName,
      markerVerified: false,
    }
  }

  const key = `${target.runtimeEnvironment}:${target.host}/${target.databaseName}`
  if (_identityCheck?.key === key) return _identityCheck.promise

  const promise = (async () => {
    const rows = await getSql()`
      SELECT environment, neon_project_id, neon_branch_id, neon_endpoint_id,
             database_name, current_database() AS connected_database
      FROM public.preview_environment
      WHERE id = 1
    `
    assertStagingDatabaseMarker(rows[0] as StagingDatabaseMarker | undefined)

    return {
      environment: 'staging' as const,
      runtimeEnvironment: target.runtimeEnvironment,
      host: target.host,
      databaseName: target.databaseName,
      markerVerified: true,
      projectId: 'flat-butterfly-48885553',
      branchId: 'br-dawn-credit-aqzydokc',
      endpointId: 'ep-raspy-snow-aqusk7qe',
    }
  })()

  _identityCheck = { key, promise }
  try {
    return await promise
  } catch (error) {
    if (_identityCheck?.promise === promise) _identityCheck = null
    throw error
  }
}

function _sqlPlaceholder() {}
export const sql = new Proxy(
  _sqlPlaceholder as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      return (async () => {
        await verifyDatabaseIdentity()
        return (getSql() as unknown as (...queryArgs: unknown[]) => unknown)(...args)
      })()
    },
    get(_target, prop) {
      const instance = getSql()
      const value = instance[prop as keyof typeof instance]
      if (typeof value !== 'function') return value
      return (...args: unknown[]) =>
        verifyDatabaseIdentity().then(() =>
          (value as (...methodArgs: unknown[]) => unknown).apply(instance, args),
        )
    },
  },
)
