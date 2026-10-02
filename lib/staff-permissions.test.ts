import assert from 'node:assert/strict'
import test from 'node:test'
import {
  roleHasFullAccess,
  roleHasPermission,
  type StaffPermission,
  type StaffRole,
} from './staff-permissions'

const permissions: StaffPermission[] = [
  'dashboard:read', 'brokers:read', 'brokers:manage', 'editorial:read', 'editorial:write',
  'moderation:review', 'leads:read', 'leads:manage', 'settings:manage', 'staff:manage',
  'audit:read', 'audit:export',
]

const fullAccessRoles: StaffRole[] = [
  'super_admin',
  'editor_publisher',
  'commercial_manager',
  'support_reviewer',
  'analyst',
]

test('full-access roles retain every permission and merchants have none', () => {
  for (const role of fullAccessRoles) {
    assert.equal(roleHasFullAccess(role), true, role)
    for (const permission of permissions) {
      assert.equal(roleHasPermission(role, permission), true, `${role}:${permission}`)
    }
  }

  for (const permission of permissions) {
    assert.equal(roleHasPermission('merchant', permission), false, permission)
  }
})

test('Admin role can view the dashboard and manage Admin accounts only', () => {
  const adminPermissions: StaffPermission[] = ['dashboard:read', 'staff:manage']
  assert.equal(roleHasFullAccess('admin'), false)

  for (const permission of permissions) {
    assert.equal(
      roleHasPermission('admin', permission),
      adminPermissions.includes(permission),
      `admin:${permission}`,
    )
  }
})

const roles: StaffRole[] = [
  'super_admin',
  'admin',
  'editor_publisher',
  'commercial_manager',
  'support_reviewer',
  'analyst',
  'merchant',
]
test('every supported role has an explicit permission result for every action', () => {
  for (const role of roles) for (const permission of permissions) {
    assert.equal(typeof roleHasPermission(role, permission), 'boolean')
  }
})
