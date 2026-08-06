import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// Support both DATABASE_URL and POSTGRES_URL (Neon integration uses POSTGRES_URL)
// Lazy initialization to avoid errors during build when env vars aren't available
let _sql: NeonQueryFunction<false, false> | null = null

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not set')
  }
  return connectionString
}

function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    _sql = neon(getConnectionString())
  }
  return _sql
}

// Export a proxy that lazily initializes the connection.
// The target MUST be a function so the Proxy's `apply` trap is reachable
// when `sql` is used as a tagged template literal (sql`SELECT ...`).
function _sqlPlaceholder() {}
export const sql = new Proxy(_sqlPlaceholder as unknown as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, args) {
    return (getSql() as unknown as (...a: unknown[]) => unknown)(...args)
  },
  get(_target, prop) {
    const instance = getSql()
    const value = instance[prop as keyof typeof instance]
    return typeof value === 'function' ? (value as Function).bind(instance) : value
  }
})
