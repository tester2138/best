import assert from 'node:assert/strict'
import test from 'node:test'
import { isMfaSessionFresh, roleHasPermission, type StaffPermission, type StaffRole } from './staff-permissions'

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

test('analyst is read-only and cannot access lead contact records or export audit data', () => {
  assert.equal(roleHasPermission('analyst', 'dashboard:read'), true)
  assert.equal(roleHasPermission('analyst', 'brokers:read'), true)
  assert.equal(roleHasPermission('analyst', 'editorial:read'), true)
  assert.equal(roleHasPermission('analyst', 'audit:read'), true)
  for (const permission of ['brokers:manage', 'editorial:write', 'moderation:review', 'leads:read', 'leads:manage', 'settings:manage', 'staff:manage', 'audit:export'] as const) {
    assert.equal(roleHasPermission('analyst', permission), false, permission)
  }
})

test('commercial staff can manage brokers and leads but cannot change editorial conclusions', () => {
  assert.equal(roleHasPermission('commercial_manager', 'brokers:manage'), true)
  assert.equal(roleHasPermission('commercial_manager', 'leads:manage'), true)
  for (const permission of ['editorial:write', 'moderation:review', 'settings:manage', 'staff:manage'] as const) {
    assert.equal(roleHasPermission('commercial_manager', permission), false, permission)
  }
})

test('MFA freshness rejects pre-enrollment sessions and invalid timestamps', () => {
  const factor = '2026-09-30T12:00:00.000Z'
  assert.equal(isMfaSessionFresh(true, factor, '2026-09-30T11:59:59.000Z'), false)
  assert.equal(isMfaSessionFresh(true, factor, '2026-09-30T12:00:00.000Z'), true)
  assert.equal(isMfaSessionFresh(false, factor, '2026-09-30T12:00:01.000Z'), false)
  assert.equal(isMfaSessionFresh(true, factor, null), false)
  assert.equal(isMfaSessionFresh(true, 'invalid', '2026-09-30T12:00:01.000Z'), false)
})

const roles: StaffRole[] = ['super_admin', 'editor_publisher', 'commercial_manager', 'support_reviewer', 'analyst', 'merchant']
test('every supported role has an explicit permission result for every action', () => {
  for (const role of roles) for (const permission of permissions) {
    assert.equal(typeof roleHasPermission(role, permission), 'boolean')
  }
})
