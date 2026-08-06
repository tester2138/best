import { Redis } from '@upstash/redis'

/**
 * Rate limiter (Blueprint Section 9.5).
 * Upstash is optional: when the env vars are absent (e.g. the v0 preview),
 * the limiter becomes a no-op that always allows the request.
 */

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null

export const LIMITS = {
  login: { n: 5, windowSec: 900 } /* per ip+email */,
  passwordReset: { n: 3, windowSec: 3600 } /* per email */,
  save: { n: 120, windowSec: 3600 } /* per user */,
  publish: { n: 20, windowSec: 3600 } /* per brand */,
  upload: { n: 20, windowSec: 86400 } /* per brand */,
  claim: { n: 3, windowSec: 86400 } /* per ip */,
} as const

export async function rateLimit(
  bucket: keyof typeof LIMITS,
  id: string,
): Promise<{ ok: boolean }> {
  if (!redis) return { ok: true }
  const { n, windowSec } = LIMITS[bucket]
  const key = `rl:${bucket}:${id}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSec)
  return { ok: count <= n }
}
