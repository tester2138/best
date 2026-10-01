import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AUTH_SURFACE_PATHS,
  getAuthSurfaceForPath,
  getPostLoginAuthSurface,
  getSafeAuthNextPath,
  isAuthSurfaceFlowPath,
  isAuthSurfaceOpenPath,
} from './portal/auth-routing'

test('admin and business routes resolve to separate auth surfaces', () => {
  assert.equal(getAuthSurfaceForPath('/admin'), 'admin')
  assert.equal(getAuthSurfaceForPath('/admin/brands'), 'admin')
  assert.equal(getAuthSurfaceForPath('/business'), 'business')
  assert.equal(getAuthSurfaceForPath('/business/offers'), 'business')
  assert.equal(getAuthSurfaceForPath('/administrator'), null)
  assert.equal(getAuthSurfaceForPath('/businesses'), null)
})

test('staff sign-in always routes to admin while merchant sign-in stays in business', () => {
  assert.equal(getPostLoginAuthSurface('business', true), 'admin')
  assert.equal(getPostLoginAuthSurface('admin', true), 'admin')
  assert.equal(getPostLoginAuthSurface('business', false), 'business')
})

test('open auth routes stay within their own surface', () => {
  assert.equal(isAuthSurfaceOpenPath('admin', '/admin/login'), true)
  assert.equal(isAuthSurfaceOpenPath('admin', '/business/login'), false)
  assert.equal(isAuthSurfaceOpenPath('business', '/business/login'), true)
  assert.equal(isAuthSurfaceOpenPath('business', '/admin/login'), false)
  assert.equal(isAuthSurfaceFlowPath('admin', '/admin/security'), true)
  assert.equal(isAuthSurfaceFlowPath('business', '/business/set-password'), true)
  assert.equal(isAuthSurfaceFlowPath('admin', '/business/security'), false)
})

test('post-login destinations cannot escape their auth surface', () => {
  assert.equal(getSafeAuthNextPath('admin', '/admin/news'), '/admin/news')
  assert.equal(getSafeAuthNextPath('business', '/business/offers'), '/business/offers')
  assert.equal(getSafeAuthNextPath('admin', '/business'), AUTH_SURFACE_PATHS.admin.home)
  assert.equal(getSafeAuthNextPath('business', '/admin'), AUTH_SURFACE_PATHS.business.home)
  assert.equal(getSafeAuthNextPath('admin', '//example.com'), AUTH_SURFACE_PATHS.admin.home)
  assert.equal(getSafeAuthNextPath('admin', '/admin/login'), AUTH_SURFACE_PATHS.admin.home)
  assert.equal(getSafeAuthNextPath('admin', '/admin/%2f%2fevil'), AUTH_SURFACE_PATHS.admin.home)
})
