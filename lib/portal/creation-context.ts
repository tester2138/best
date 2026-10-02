import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Account-creation gate.
 *
 * The portal has no public sign-up. Accounts are created only by protected
 * admin actions such as `assignBrand` and Admin account management. Better
 * Auth's sign-up endpoint is still mounted, so the `user.create.before` hook
 * (lib/auth.ts) rejects any creation that is neither an ADMIN_EMAILS bootstrap
 * nor explicitly admin-initiated. Provisioning actions wrap their `signUpEmail`
 * call in `allowAccountCreation(...)` for that async call only.
 */
const store = new AsyncLocalStorage<boolean>()

export function allowAccountCreation<T>(fn: () => Promise<T>): Promise<T> {
  return store.run(true, fn)
}

export function isAccountCreationAllowed(): boolean {
  return store.getStore() === true
}
