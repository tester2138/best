import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBlobStorageTestEnvironment,
  getVerifiedBlobToken,
  resolveBlobStorageIdentity,
  STAGING_BLOB_STORE_ID,
  PRODUCTION_BLOB_STORE_ID,
} from './blob-storage-safety'

test('accepts the staging Blob token in Preview and Development', () => {
  for (const runtimeEnvironment of ['preview', 'development'] as const) {
    const env = createBlobStorageTestEnvironment(runtimeEnvironment, STAGING_BLOB_STORE_ID)
    const identity = resolveBlobStorageIdentity(env)

    assert.equal(identity.environment, 'staging')
    assert.equal(identity.runtimeEnvironment, runtimeEnvironment)
    assert.equal(identity.storeId, STAGING_BLOB_STORE_ID)
  }
})

test('accepts only the Production Blob token in Production', () => {
  const env = createBlobStorageTestEnvironment('production', PRODUCTION_BLOB_STORE_ID)
  const identity = resolveBlobStorageIdentity(env)

  assert.equal(identity.environment, 'production')
  assert.equal(identity.storeId, PRODUCTION_BLOB_STORE_ID)
})

test('rejects the Production Blob token in Preview and Development', () => {
  for (const runtimeEnvironment of ['preview', 'development'] as const) {
    const env = createBlobStorageTestEnvironment(runtimeEnvironment, PRODUCTION_BLOB_STORE_ID)
    assert.throws(() => resolveBlobStorageIdentity(env), /provider-pinned staging store/)
  }
})

test('rejects the staging Blob token in Production', () => {
  const env = createBlobStorageTestEnvironment('production', STAGING_BLOB_STORE_ID)
  assert.throws(() => resolveBlobStorageIdentity(env), /provider-pinned production store/)
})

test('fails closed for missing, malformed, and unknown-environment configuration', () => {
  assert.throws(
    () => resolveBlobStorageIdentity({ NODE_ENV: 'test', VERCEL_ENV: 'preview' }),
    /BLOB_READ_WRITE_TOKEN is not configured/,
  )
  assert.throws(
    () =>
      resolveBlobStorageIdentity({
        NODE_ENV: 'test',
        VERCEL_ENV: 'preview',
        BLOB_READ_WRITE_TOKEN: 'not-a-blob-token',
      }),
    /token format is invalid/,
  )
  assert.throws(
    () => resolveBlobStorageIdentity({ NODE_ENV: 'test' }),
    /VERCEL_ENV is explicitly/,
  )
})

test('returns a Blob token only after validating its environment and store identity', () => {
  const env = createBlobStorageTestEnvironment('preview', STAGING_BLOB_STORE_ID)
  assert.equal(getVerifiedBlobToken(env), env.BLOB_READ_WRITE_TOKEN)

  const productionToken = createBlobStorageTestEnvironment('production', PRODUCTION_BLOB_STORE_ID)
    .BLOB_READ_WRITE_TOKEN
  assert.throws(
    () =>
      getVerifiedBlobToken({
        NODE_ENV: 'test',
        VERCEL_ENV: 'preview',
        BLOB_READ_WRITE_TOKEN: productionToken,
      }),
    /provider-pinned staging store/,
  )
})

export {}
