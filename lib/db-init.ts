import { verifyDatabaseIdentity } from './db'

/**
 * Kept for existing route callers. Schema changes are applied only by the
 * explicit versioned migration runner, never by an ordinary API request.
 */
export async function initializeDatabase(): Promise<boolean> {
  await verifyDatabaseIdentity()
  return true
}
