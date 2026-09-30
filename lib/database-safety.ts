export const STAGING_DATABASE_IDENTITY = {
  environment: 'staging',
  projectId: 'flat-butterfly-48885553',
  branchId: 'br-dawn-credit-aqzydokc',
  endpointId: 'ep-raspy-snow-aqusk7qe',
  host: 'ep-raspy-snow-aqusk7qe.c-8.us-east-1.aws.neon.tech',
  databaseName: 'neondb',
} as const

const KNOWN_PRODUCTION_DATABASE_HOST =
  'ep-lingering-star-aqcvhrip.c-8.us-east-1.aws.neon.tech'

export type DatabaseTarget = {
  environment: 'production' | 'staging'
  runtimeEnvironment: 'production' | 'preview' | 'development'
  connectionString: string
  host: string
  databaseName: string
}

export type StagingDatabaseMarker = {
  environment: unknown
  neon_project_id: unknown
  neon_branch_id: unknown
  neon_endpoint_id: unknown
  database_name: unknown
  connected_database: unknown
}

function parseDatabaseUrl(connectionString: string): URL {
  let url: URL
  try {
    url = new URL(connectionString)
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL URL.')
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol.')
  }

  return url
}

export function assertStagingConnectionString(connectionString: string): URL {
  const url = parseDatabaseUrl(connectionString)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))

  if (
    url.hostname !== STAGING_DATABASE_IDENTITY.host ||
    databaseName !== STAGING_DATABASE_IDENTITY.databaseName
  ) {
    throw new Error(
      'Staging database connection rejected: host and database must match the provider-pinned staging endpoint.',
    )
  }

  return url
}

export function resolveDatabaseTarget(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseTarget {
  const runtimeEnvironment =
    env.VERCEL_ENV ?? (env.NODE_ENV === 'development' ? 'development' : undefined)

  if (
    runtimeEnvironment !== 'production' &&
    runtimeEnvironment !== 'preview' &&
    runtimeEnvironment !== 'development'
  ) {
    throw new Error(
      'Database access is disabled until VERCEL_ENV is explicitly production, preview, or development.',
    )
  }

  const connectionString = env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured for this deployment environment.')
  }

  const url = parseDatabaseUrl(connectionString)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))

  if (runtimeEnvironment === 'production') {
    if (url.hostname === STAGING_DATABASE_IDENTITY.host) {
      throw new Error('Production database access is blocked because DATABASE_URL points to staging.')
    }

    return {
      environment: 'production',
      runtimeEnvironment,
      connectionString,
      host: url.hostname,
      databaseName,
    }
  }

  assertStagingConnectionString(connectionString)

  if (url.hostname === KNOWN_PRODUCTION_DATABASE_HOST) {
    throw new Error('Preview and Development database access to the production Neon endpoint is blocked.')
  }

  return {
    environment: 'staging',
    runtimeEnvironment,
    connectionString,
    host: url.hostname,
    databaseName,
  }
}
