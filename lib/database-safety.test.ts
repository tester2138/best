import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertStagingConnectionString,
  assertStagingDatabaseMarker,
  PRODUCTION_DATABASE_HOSTS,
  resolveDatabaseTarget,
  STAGING_DATABASE_IDENTITY,
} from './database-safety'

const stagingUrl = (host: string) =>
  `postgresql://staging_test:never-a-real-password@${host}/neondb?sslmode=require`

const validMarker = {
  environment: 'staging',
  neon_project_id: STAGING_DATABASE_IDENTITY.projectId,
  neon_branch_id: STAGING_DATABASE_IDENTITY.branchId,
  neon_endpoint_id: STAGING_DATABASE_IDENTITY.endpointId,
  database_name: STAGING_DATABASE_IDENTITY.databaseName,
  connected_database: STAGING_DATABASE_IDENTITY.databaseName,
}

test('accepts the provider-pinned pooled staging application URL', () => {
  const target = resolveDatabaseTarget({
    NODE_ENV: 'test',
    VERCEL_ENV: 'preview',
      STAGING_DATABASE_URL: stagingUrl(STAGING_DATABASE_IDENTITY.pooledHost),
  })

  assert.equal(target.environment, 'staging')
  assert.equal(target.runtimeEnvironment, 'preview')
  assert.equal(target.host, STAGING_DATABASE_IDENTITY.pooledHost)
  assert.equal(target.databaseName, 'neondb')
})

test('accepts the provider-pinned direct staging URL for migrations', () => {
  assert.equal(
    assertStagingConnectionString(stagingUrl(STAGING_DATABASE_IDENTITY.host)).hostname,
    STAGING_DATABASE_IDENTITY.host,
  )
})

test('rejects Production database URLs from Preview and Development', () => {
  for (const runtimeEnvironment of ['preview', 'development'] as const) {
    assert.throws(
      () =>
        resolveDatabaseTarget({
          NODE_ENV: 'test',
          VERCEL_ENV: runtimeEnvironment,
          STAGING_DATABASE_URL: stagingUrl(PRODUCTION_DATABASE_HOSTS[1]),
          DATABASE_URL: stagingUrl(PRODUCTION_DATABASE_HOSTS[1]),
        }),
      /production Neon endpoint is blocked/,
    )
  }
})

test('does not fall back to the Production URL in Preview or Development', () => {
  for (const runtimeEnvironment of ['preview', 'development'] as const) {
    assert.throws(
      () =>
        resolveDatabaseTarget({
          NODE_ENV: 'test',
          VERCEL_ENV: runtimeEnvironment,
          DATABASE_URL: stagingUrl(PRODUCTION_DATABASE_HOSTS[1]),
        }),
      /STAGING_DATABASE_URL is not configured/,
    )
  }
})

test('accepts only the provider-pinned Production hosts in Production', () => {
  const target = resolveDatabaseTarget({
    NODE_ENV: 'test',
    VERCEL_ENV: 'production',
    DATABASE_URL: stagingUrl(PRODUCTION_DATABASE_HOSTS[1]),
  })

  assert.equal(target.environment, 'production')
  assert.equal(target.runtimeEnvironment, 'production')
})

test('rejects an unrelated PostgreSQL host from Preview', () => {
  assert.throws(
    () =>
        resolveDatabaseTarget({
          NODE_ENV: 'test',
          VERCEL_ENV: 'preview',
          STAGING_DATABASE_URL: stagingUrl('db.example.test'),
      }),
    /provider-pinned staging endpoint/,
  )
})

test('rejects an unexpected staging database name', () => {
  assert.throws(
    () =>
      assertStagingConnectionString(
        `postgresql://staging_test:password@${STAGING_DATABASE_IDENTITY.pooledHost}/other`,
      ),
    /provider-pinned staging endpoint/,
  )
})

test('rejects database use when the runtime environment is unknown', () => {
  assert.throws(
    () => resolveDatabaseTarget({
      NODE_ENV: 'test',
      DATABASE_URL: stagingUrl(STAGING_DATABASE_IDENTITY.host),
    }),
    /VERCEL_ENV is explicitly/,
  )
})

test('accepts only the unique provider marker for the staging branch', () => {
  assert.doesNotThrow(() => assertStagingDatabaseMarker(validMarker))
  assert.throws(
    () => assertStagingDatabaseMarker({ ...validMarker, neon_branch_id: 'br-production' }),
    /provider-pinned branch marker did not match/,
  )
  assert.throws(() => assertStagingDatabaseMarker(undefined), /provider-pinned branch marker/)
})

test('rejects Production connection strings that have an unknown host', () => {
  assert.throws(
    () =>
        resolveDatabaseTarget({
          NODE_ENV: 'test',
          VERCEL_ENV: 'production',
          DATABASE_URL: stagingUrl('db.example.test'),
      }),
    /provider-pinned production host/,
  )
})
