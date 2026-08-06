import type { ActionResult } from '@/types/portal'

/**
 * Tiny constructors so every server action returns a uniform ActionResult.
 * Client components switch on `ok` and `code` (Sections 7 & 16).
 */

export function ok<T>(data?: T): ActionResult<T> {
  return { ok: true, data }
}

type ErrCode = NonNullable<Extract<ActionResult, { ok: false }>['code']>

/**
 * Typed error thrown inside `run(...)` bodies (Blueprint Section 7). Carries a
 * machine code plus optional field issues / server version for conflict UIs.
 */
export class Err extends Error {
  code: ErrCode
  issues?: { path: string; message: string }[]
  serverVersion?: number
  constructor(
    message: string,
    code: ErrCode = 'server',
    extra?: { issues?: { path: string; message: string }[]; serverVersion?: number },
  ) {
    super(message)
    this.name = 'Err'
    this.code = code
    this.issues = extra?.issues
    this.serverVersion = extra?.serverVersion
  }
}

/**
 * Wrap a server action body so it always resolves to an ActionResult. Known
 * `Err`s become coded failures; anything else is logged and returned as a
 * generic server error (never leaking internals to the client).
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    if (e instanceof Err) {
      return {
        ok: false,
        error: e.message,
        code: e.code,
        issues: e.issues,
        serverVersion: e.serverVersion,
      }
    }
    // Next.js redirect()/notFound() throw control-flow errors — rethrow them.
    if (e && typeof e === 'object' && 'digest' in e) throw e
    console.error('[v0] action error:', e)
    return { ok: false, error: 'Something went wrong', code: 'server' }
  }
}

export function err(
  error: string,
  code: ErrCode = 'server',
  extra?: {
    issues?: { path: string; message: string }[]
    serverVersion?: number
  },
): ActionResult<never> {
  return { ok: false, error, code, ...extra }
}

/** Convenience for the most common coded failures. */
export const fail = {
  validation: (issues: { path: string; message: string }[]) =>
    err('Please fix the highlighted fields.', 'validation', { issues }),
  forbidden: () => err('You do not have access to this brand.', 'forbidden'),
  notFound: (what = 'Item') => err(`${what} not found.`, 'not_found'),
  versionConflict: (serverVersion: number) =>
    err(
      'This section changed since you opened it. Reload to see the latest version.',
      'version_conflict',
      { serverVersion },
    ),
  rateLimited: () => err('Too many requests. Please slow down.', 'rate_limited'),
  locked: () => err('This brand is locked by an administrator.', 'locked'),
  paused: () => err('Portal access for this brand is paused.', 'paused'),
  capReached: (what = 'limit') => err(`You have reached the ${what}.`, 'cap_reached'),
  server: (msg = 'Something went wrong. Please try again.') => err(msg, 'server'),
}
