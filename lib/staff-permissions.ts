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

export function roleHasPermission(role: StaffRole, permission: StaffPermission): boolean {
  return role !== 'merchant' && ADMIN_PERMISSIONS[permission]
}
