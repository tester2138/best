import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Account-creation gate.
 *
 * The portal has no public sign-up. Accounts are created only by the admin's
 * `assignBrand` action. Better Auth's sign-up endpoint is still mounted, so the
 * `user.create.before` hook (lib/auth.ts) rejects any creation that is neither
 * an ADMIN_EMAILS bootstrap nor explicitly admin-initiated. `assignBrand` wraps
 * its `signUpEmail` call in `allowAccountCreation(...)` to flip this flag for
 * the duration of that async call only.
 */
const store = new AsyncLocalStorage<boolean>()

export function allowAccountCreation<T>(fn: () => Promise<T>): Promise<T> {
  return store.run(true, fn)
}

export function isAccountCreationAllowed(): boolean {
  return store.getStore() === true
}
