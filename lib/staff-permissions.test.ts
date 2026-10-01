import assert from 'node:assert/strict'
import test from 'node:test'
import { roleHasPermission, type StaffPermission, type StaffRole } from './staff-permissions'

const permissions: StaffPermission[] = [
  'dashboard:read', 'brokers:read', 'brokers:manage', 'editorial:read', 'editorial:write',
  'moderation:review', 'leads:read', 'leads:manage', 'settings:manage', 'staff:manage',
  'audit:read', 'audit:export',
]

test('super admin has every declared permission and merchant has none', () => {
  for (const permission of permissions) {
    assert.equal(roleHasPermission('super_admin', permission), true, permission)
    assert.equal(roleHasPermission('merchant', permission), false, permission)
  }
})

test('every admin staff role has full permissions and merchants have none', () => {
  const adminRoles: StaffRole[] = [
    'super_admin',
    'editor_publisher',
    'commercial_manager',
    'support_reviewer',
    'analyst',
  ]

  for (const role of adminRoles) {
    for (const permission of permissions) {
      assert.equal(roleHasPermission(role, permission), true, `${role}:${permission}`)
    }
  }

  for (const permission of permissions) {
    assert.equal(roleHasPermission('merchant', permission), false, permission)
  }
})

const roles: StaffRole[] = ['super_admin', 'editor_publisher', 'commercial_manager', 'support_reviewer', 'analyst', 'merchant']
test('every supported role has an explicit permission result for every action', () => {
  for (const role of roles) for (const permission of permissions) {
    assert.equal(typeof roleHasPermission(role, permission), 'boolean')
  }
})
