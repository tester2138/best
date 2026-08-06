/**
 * Direct seed script — runs via `node scripts/run-seed.mjs`
 * Reads posts from data/posts.ts via the compiled bundle (transpiled by tsx).
 * Uses the DATABASE_URL from the environment.
 *
 * Usage: DATABASE_URL=... node --import tsx/esm scripts/run-seed.mjs
 * Or via the package.json script: pnpm seed-posts
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

// We can't easily import TypeScript from Node, so we use the seed API instead.
// This script calls the running Next.js dev server's seed endpoint.
const DEV_PORT = process.env.DEV_PORT || 3000
const SEED_SECRET = process.env.SEED_SECRET || 'dev-seed-bypass'

const res = await fetch(`http://localhost:${DEV_PORT}/api/admin/seed-posts`, {
  method: 'POST',
  headers: { 'x-seed-secret': SEED_SECRET }
})

const data = await res.json()
console.log('Seed result:', JSON.stringify(data, null, 2))
