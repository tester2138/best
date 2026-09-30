export const STAGING_DATABASE_IDENTITY = {
  environment: 'staging',
  projectId: 'flat-butterfly-48885553',
  branchId: 'br-dawn-credit-aqzydokc',
  endpointId: 'ep-raspy-snow-aqusk7qe',
  host: 'ep-raspy-snow-aqusk7qe.c-8.us-east-1.aws.neon.tech',
  pooledHost: 'ep-raspy-snow-aqusk7qe-pooler.c-8.us-east-1.aws.neon.tech',
  databaseName: 'neondb',
} as const

export const STAGING_DATABASE_HOSTS = [
  STAGING_DATABASE_IDENTITY.host,
  STAGING_DATABASE_IDENTITY.pooledHost,
] as const

export const PRODUCTION_DATABASE_HOSTS = [
  'ep-lingering-star-aqcvhrip.c-8.us-east-1.aws.neon.tech',
  'ep-lingering-star-aqcvhrip-pooler.c-8.us-east-1.aws.neon.tech',
] as const

function isKnownProductionHost(host: string): boolean {
  return (PRODUCTION_DATABASE_HOSTS as readonly string[]).includes(host)
}

export type RuntimeEnvironment = 'production' | 'preview' | 'development'

export type DatabaseTarget = {
  environment: 'production' | 'staging'
  runtimeEnvironment: RuntimeEnvironment
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

export type VerifiedDatabaseIdentity = {
  environment: 'production' | 'staging'
  runtimeEnvironment: RuntimeEnvironment
  host: string
  databaseName: string
  markerVerified: boolean
  projectId?: string
  branchId?: string
  endpointId?: string
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
    !(STAGING_DATABASE_HOSTS as readonly string[]).includes(url.hostname) ||
    databaseName !== STAGING_DATABASE_IDENTITY.databaseName
  ) {
    throw new Error(
      'Staging database connection rejected: host and database must match the provider-pinned staging endpoint.',
    )
  }

  return url
}

export function assertStagingDatabaseMarker(
  marker: StagingDatabaseMarker | undefined,
): void {
  if (
    !marker ||
    marker.environment !== STAGING_DATABASE_IDENTITY.environment ||
    marker.neon_project_id !== STAGING_DATABASE_IDENTITY.projectId ||
    marker.neon_branch_id !== STAGING_DATABASE_IDENTITY.branchId ||
    marker.neon_endpoint_id !== STAGING_DATABASE_IDENTITY.endpointId ||
    marker.database_name !== STAGING_DATABASE_IDENTITY.databaseName ||
    marker.connected_database !== STAGING_DATABASE_IDENTITY.databaseName
  ) {
    throw new Error(
      'Staging database access rejected: provider-pinned branch marker did not match.',
    )
  }
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
    if (!isKnownProductionHost(url.hostname)) {
      throw new Error(
        'Production database access rejected: DATABASE_URL does not match the provider-pinned production host.',
      )
    }

    return {
      environment: 'production',
      runtimeEnvironment,
      connectionString,
      host: url.hostname,
      databaseName,
    }
  }

  if (isKnownProductionHost(url.hostname)) {
    throw new Error(
      'Preview and Development database access to the production Neon endpoint is blocked.',
    )
  }

  assertStagingConnectionString(connectionString)

  return {
    environment: 'staging',
    runtimeEnvironment,
    connectionString,
    host: url.hostname,
    databaseName,
  }
}
