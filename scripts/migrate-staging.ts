import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { Client } from 'pg'
import {
  assertStagingConnectionString,
  assertStagingDatabaseMarker,
  STAGING_DATABASE_IDENTITY,
  type StagingDatabaseMarker,
} from '../lib/database-safety'

const migrationDirectory = path.join(process.cwd(), 'migrations', 'staging')
const migrationHistoryTable = 'public.schema_migrations'
const confirmApply = 'apply-staging-only'
const confirmRollback = 'rollback-staging-safety'

type Migration = {
  version: string
  name: string
  filename: string
  sql: string
  checksum: string
}

type MigrationHistoryRow = {
  version: string
  checksum: string
}

function runtimeEnvironment(): 'preview' | 'development' {
  const environment =
    process.env.VERCEL_ENV ??
    (process.env.NODE_ENV === 'development' ? 'development' : undefined)

  if (environment === 'production') {
    throw new Error('Staging migrations are never allowed in Production.')
  }
  if (environment !== 'preview' && environment !== 'development') {
    throw new Error('Set VERCEL_ENV to preview or development before running staging migrations.')
  }
  return environment
}

function getMode(args: string[]): 'dry-run' | 'apply' | 'rollback' {
  const modes = args.filter((arg) => ['--dry-run', '--apply', '--rollback'].includes(arg))
  if (modes.length > 1) throw new Error('Choose only one of --dry-run, --apply, or --rollback.')
  if (modes[0] === '--apply') return 'apply'
  if (modes[0] === '--rollback') return 'rollback'
  return 'dry-run'
}

async function loadMigrations(): Promise<Migration[]> {
  const filenames = (await readdir(migrationDirectory))
    .filter((filename) => /^\d{8}_\d{3}_[a-z0-9_-]+\.sql$/.test(filename))
    .sort()

  return Promise.all(
    filenames.map(async (filename) => {
      const version = filename.slice(0, 12)
      const sql = await readFile(path.join(migrationDirectory, filename), 'utf8')
      return {
        version,
        name: filename.slice(13, -4),
        filename,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      }
    }),
  )
}

async function assertBranchMarker(client: Client): Promise<boolean> {
  const exists = await client.query<{ marker_table: string | null }>(
    `SELECT to_regclass('public.preview_environment')::text AS marker_table`,
  )
  if (!exists.rows[0]?.marker_table) return false

  const result = await client.query<StagingDatabaseMarker>(`
    SELECT environment, neon_project_id, neon_branch_id, neon_endpoint_id,
           database_name, current_database() AS connected_database
    FROM public.preview_environment
    WHERE id = 1
  `)
  assertStagingDatabaseMarker(result.rows[0])
  return true
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    console.log(
      'Usage: pnpm migrate:staging [--dry-run|--apply|--rollback]\n' +
        'Dry run uses DATABASE_URL. Apply/rollback require a direct STAGING_MIGRATION_URL and explicit confirmation.',
    )
    return
  }

  runtimeEnvironment()
  const mode = getMode(args)
  const connectionString =
    mode === 'dry-run' ? process.env.DATABASE_URL : process.env.STAGING_MIGRATION_URL
  if (!connectionString) {
    throw new Error(
      mode === 'dry-run'
        ? 'DATABASE_URL is required for a read-only migration dry run.'
        : 'STAGING_MIGRATION_URL is required for staging-only migration writes.',
    )
  }

  const url = assertStagingConnectionString(connectionString)
  if (mode !== 'dry-run' && url.hostname !== STAGING_DATABASE_IDENTITY.host) {
    throw new Error('Apply and rollback require the direct, non-pooled staging endpoint.')
  }
  if (mode === 'apply' && process.env.STAGING_MIGRATION_CONFIRM !== confirmApply) {
    throw new Error(`Set STAGING_MIGRATION_CONFIRM=${confirmApply} to apply staging migrations.`)
  }
  if (mode === 'rollback' && process.env.STAGING_MIGRATION_CONFIRM !== confirmRollback) {
    throw new Error(`Set STAGING_MIGRATION_CONFIRM=${confirmRollback} to roll back staging safety tables.`)
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    const database = await client.query<{ database_name: string }>(
      'SELECT current_database() AS database_name',
    )
    if (database.rows[0]?.database_name !== STAGING_DATABASE_IDENTITY.databaseName) {
      throw new Error('Migration target database does not match the provider-pinned staging database.')
    }

    const markerVerified = await assertBranchMarker(client)
    if (!markerVerified && mode === 'rollback') {
      throw new Error('Rollback refused because the unique staging branch marker is missing.')
    }

    if (mode === 'rollback') {
      const permissions = await client.query<{ can_create: boolean }>(
        `SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS can_create`,
      )
      if (!permissions.rows[0]?.can_create) {
        throw new Error('The staging migration role lacks schema privileges for rollback.')
      }
      await client.query('BEGIN')
      try {
        await client.query('DROP TABLE IF EXISTS public.preview_smoke_checks')
        await client.query('DROP TABLE IF EXISTS public.preview_environment')
        await client.query(
          `DELETE FROM ${migrationHistoryTable} WHERE version = '20260930_001'`,
        )
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
      console.log('Rolled back staging-only safety tables; Preview database access now fails closed.')
      return
    }

    const migrations = await loadMigrations()
    const historyTable = await client.query<{ history_table: string | null }>(
      `SELECT to_regclass('${migrationHistoryTable}')::text AS history_table`,
    )
    const appliedRows = historyTable.rows[0]?.history_table
      ? await client.query<MigrationHistoryRow>(
          `SELECT version, checksum FROM ${migrationHistoryTable}`,
        )
      : { rows: [] as MigrationHistoryRow[] }
    const applied = new Map(appliedRows.rows.map((row) => [row.version, row.checksum]))

    for (const migration of migrations) {
      const existingChecksum = applied.get(migration.version)
      if (existingChecksum && existingChecksum !== migration.checksum) {
        throw new Error(`Applied migration ${migration.version} has a different checksum.`)
      }
    }

    const pending = migrations.filter((migration) => !applied.has(migration.version))
    console.log(
      `Verified ${markerVerified ? 'provider marker' : 'pinned first-migration endpoint'} on ${url.hostname}/${STAGING_DATABASE_IDENTITY.databaseName}.`,
    )
    console.log(`${pending.length} staging migration(s) pending.`)
    for (const migration of pending) {
      console.log(`${mode === 'dry-run' ? 'would apply' : 'applying'} ${migration.filename} (${migration.checksum.slice(0, 12)}).`)
    }

    if (mode === 'dry-run' || pending.length === 0) return

    const permissions = await client.query<{ can_create: boolean }>(
      `SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS can_create`,
    )
    if (!permissions.rows[0]?.can_create) {
      throw new Error('The staging migration role lacks CREATE privileges on the public schema.')
    }

    const runtimeRole = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bestforex_preview_runtime') AS exists`,
    )
    if (!runtimeRole.rows[0]?.exists) {
      throw new Error('The provider-pinned staging runtime role is missing.')
    }

    for (const migration of pending) {
      await client.query('BEGIN')
      try {
        await client.query(migration.sql)
        await client.query(
          `INSERT INTO ${migrationHistoryTable} (version, name, checksum)
           VALUES ($1, $2, $3)
           ON CONFLICT (version) DO NOTHING`,
          [migration.version, migration.name, migration.checksum],
        )
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure.'
  console.error(`Staging migration stopped: ${message}`)
  process.exitCode = 1
})
