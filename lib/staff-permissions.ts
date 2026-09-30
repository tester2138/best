export type StaffRole =
  | 'super_admin'
  | 'editor_publisher'
  | 'commercial_manager'
  | 'support_reviewer'
  | 'analyst'
  | 'merchant'

export type StaffPermission =
  | 'dashboard:read'
  | 'brokers:read'
  | 'brokers:manage'
  | 'editorial:read'
  | 'editorial:write'
  | 'moderation:review'
  | 'leads:read'
  | 'leads:manage'
  | 'settings:manage'
  | 'staff:manage'
  | 'audit:read'
  | 'audit:export'

const ROLE_PERMISSIONS: Record<Exclude<StaffRole, 'super_admin' | 'merchant'>, readonly StaffPermission[]> = {
  editor_publisher: ['dashboard:read', 'brokers:read', 'editorial:read', 'editorial:write', 'moderation:review', 'audit:read'],
  commercial_manager: ['dashboard:read', 'brokers:read', 'brokers:manage', 'leads:read', 'leads:manage', 'audit:read'],
  support_reviewer: ['dashboard:read', 'brokers:read', 'moderation:review', 'leads:read', 'leads:manage', 'audit:read'],
  analyst: ['dashboard:read', 'brokers:read', 'editorial:read', 'audit:read'],
}

export function roleHasPermission(role: StaffRole, permission: StaffPermission): boolean {
  if (role === 'super_admin') return true
  if (role === 'merchant') return false
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function isMfaSessionFresh(
  enabled: boolean,
  verifiedFactorCreatedAt: Date | string | null,
  sessionCreatedAt: Date | string | null,
): boolean {
  if (!enabled || !verifiedFactorCreatedAt || !sessionCreatedAt) return false
  const factorTime = new Date(verifiedFactorCreatedAt).getTime()
  const sessionTime = new Date(sessionCreatedAt).getTime()
  return Number.isFinite(factorTime) && Number.isFinite(sessionTime) && sessionTime >= factorTime
}
