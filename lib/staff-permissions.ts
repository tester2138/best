export type StaffRole =
  | 'super_admin'
  | 'admin'
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

const ADMIN_PERMISSIONS: Record<StaffPermission, true> = {
  'dashboard:read': true,
  'brokers:read': true,
  'brokers:manage': true,
  'editorial:read': true,
  'editorial:write': true,
  'moderation:review': true,
  'leads:read': true,
  'leads:manage': true,
  'settings:manage': true,
  'staff:manage': true,
  'audit:read': true,
  'audit:export': true,
}

const ADMIN_ROLE_PERMISSIONS = new Set<StaffPermission>(['dashboard:read', 'staff:manage'])

export function roleHasPermission(role: StaffRole, permission: StaffPermission): boolean {
  if (role === 'merchant') return false
  if (role === 'admin') return ADMIN_ROLE_PERMISSIONS.has(permission)
  return ADMIN_PERMISSIONS[permission]
}

export function roleHasFullAccess(role: StaffRole): boolean {
  return role !== 'admin' && role !== 'merchant'
}
