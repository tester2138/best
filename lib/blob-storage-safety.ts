export const STAGING_BLOB_STORE_ID = 'store_0RXGoQwheCWcRqT1'
export const PRODUCTION_BLOB_STORE_ID = 'store_8hgEfFJkLuP5ZCgE'

export type BlobStorageEnvironment = 'production' | 'staging'
export type BlobRuntimeEnvironment = 'production' | 'preview' | 'development'

export type BlobStorageIdentity = {
  environment: BlobStorageEnvironment
  runtimeEnvironment: BlobRuntimeEnvironment
  storeId: string
  tokenConfigured: true
}

function resolveRuntimeEnvironment(
  env: NodeJS.ProcessEnv,
): BlobRuntimeEnvironment | undefined {
  return env.VERCEL_ENV ?? (env.NODE_ENV === 'development' ? 'development' : undefined)
}

export function resolveBlobStorageIdentity(
  env: NodeJS.ProcessEnv = process.env,
): BlobStorageIdentity {
  const runtimeEnvironment = resolveRuntimeEnvironment(env)
  if (
    runtimeEnvironment !== 'production' &&
    runtimeEnvironment !== 'preview' &&
    runtimeEnvironment !== 'development'
  ) {
    throw new Error(
      'Blob storage access is disabled until VERCEL_ENV is explicitly production, preview, or development.',
    )
  }

  const token = env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured for this deployment environment.')
  }

  if (!token.startsWith('vercel_blob_rw_')) {
    throw new Error('Blob storage access rejected: the token format is invalid.')
  }

  const tokenStoreSuffix = token.split('_')[3]
  const environment = runtimeEnvironment === 'production' ? 'production' : 'staging'
  const storeId =
    environment === 'production' ? PRODUCTION_BLOB_STORE_ID : STAGING_BLOB_STORE_ID
  const expectedTokenStoreSuffix = storeId.replace(/^store_/, '')

  if (!tokenStoreSuffix || tokenStoreSuffix !== expectedTokenStoreSuffix) {
    throw new Error(
      `Blob storage access rejected: token does not match the provider-pinned ${environment} store.`,
    )
  }

  return { environment, runtimeEnvironment, storeId, tokenConfigured: true }
}

export function createBlobTokenForTest(storeId: string): string {
  return `vercel_blob_rw_${storeId.replace(/^store_/, '')}_test-only-secret`
}

export function createBlobStorageTestEnvironment(
  runtimeEnvironment: BlobRuntimeEnvironment,
  storeId: string,
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: runtimeEnvironment === 'development' ? 'development' : 'test',
    VERCEL_ENV: runtimeEnvironment,
    BLOB_READ_WRITE_TOKEN: createBlobTokenForTest(storeId),
  }
}

export function isBlobStorageConfigurationError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Blob storage access rejected:')
}

export function describeBlobStorageSetupError(error: unknown): string {
  if (error instanceof Error && error.message.includes('BLOB_READ_WRITE_TOKEN')) {
    return 'isolated_blob_token_missing'
  }
  return 'isolated_blob_store_not_verified'
}

export function parseBlobStorageTokenStoreId(token: string): string | null {
  if (!token.startsWith('vercel_blob_rw_')) return null
  const suffix = token.split('_')[3]
  return suffix ? `store_${suffix}` : null
}

export function getExpectedBlobStoreId(environment: BlobStorageEnvironment): string {
  return environment === 'production' ? PRODUCTION_BLOB_STORE_ID : STAGING_BLOB_STORE_ID
}

export function isKnownBlobStoreId(value: string): value is typeof STAGING_BLOB_STORE_ID | typeof PRODUCTION_BLOB_STORE_ID {
  return value === STAGING_BLOB_STORE_ID || value === PRODUCTION_BLOB_STORE_ID
}

export function getBlobTokenName(): 'BLOB_READ_WRITE_TOKEN' {
  return 'BLOB_READ_WRITE_TOKEN'
}

export function hasBlobStorageIdentity(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  try {
    resolveBlobStorageIdentity(env)
    return true
  } catch {
    return false
  }
}

export function getStagingBlobStoreId(): typeof STAGING_BLOB_STORE_ID {
  return STAGING_BLOB_STORE_ID
}

export function getProductionBlobStoreId(): typeof PRODUCTION_BLOB_STORE_ID {
  return PRODUCTION_BLOB_STORE_ID
}

export function getBlobStorageEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): BlobStorageEnvironment | undefined {
  const runtimeEnvironment = resolveRuntimeEnvironment(env)
  if (runtimeEnvironment === 'production') return 'production'
  if (runtimeEnvironment === 'preview' || runtimeEnvironment === 'development') return 'staging'
  return undefined
}

export function validateBlobStorageIdentity(
  env: NodeJS.ProcessEnv = process.env,
): BlobStorageIdentity {
  return resolveBlobStorageIdentity(env)
}

export function getBlobStorageIdentityErrorCode(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  try {
    resolveBlobStorageIdentity(env)
    return undefined
  } catch (error) {
    return describeBlobStorageSetupError(error)
  }
}

export function hasIsolatedBlobStore(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return getBlobStorageEnvironment(env) === 'staging' && hasBlobStorageIdentity(env)
}

export function hasProductionBlobStore(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return getBlobStorageEnvironment(env) === 'production' && hasBlobStorageIdentity(env)
}

export function isStagingBlobStoreId(storeId: string): boolean {
  return storeId === STAGING_BLOB_STORE_ID
}

export function isProductionBlobStoreId(storeId: string): boolean {
  return storeId === PRODUCTION_BLOB_STORE_ID
}

export function getBlobStoreIdForRuntime(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  try {
    return resolveBlobStorageIdentity(env).storeId
  } catch {
    return undefined
  }
}

export function getBlobRuntimeEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): BlobRuntimeEnvironment | undefined {
  return resolveRuntimeEnvironment(env)
}

export function isBlobTokenForStore(token: string, storeId: string): boolean {
  return parseBlobStorageTokenStoreId(token) === storeId
}

export function assertBlobTokenForStore(token: string, storeId: string): void {
  if (!isBlobTokenForStore(token, storeId)) {
    throw new Error('Blob storage access rejected: token does not match the configured store.')
  }
}

export function resolveBlobStorageIdentityFromToken(
  token: string,
  runtimeEnvironment: BlobRuntimeEnvironment,
): BlobStorageIdentity {
  return resolveBlobStorageIdentity({
    NODE_ENV: runtimeEnvironment === 'development' ? 'development' : 'test',
    VERCEL_ENV: runtimeEnvironment,
    BLOB_READ_WRITE_TOKEN: token,
  })
}

export function getBlobStorageConfigurationStatus(
  env: NodeJS.ProcessEnv = process.env,
): 'verified' | 'missing' | 'mismatch' | 'unknown_environment' {
  try {
    resolveBlobStorageIdentity(env)
    return 'verified'
  } catch (error) {
    if (error instanceof Error && error.message.includes('explicitly')) return 'unknown_environment'
    if (error instanceof Error && error.message.includes('not configured')) return 'missing'
    return 'mismatch'
  }
}

export function getBlobStorageExpectedStoreId(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const environment = getBlobStorageEnvironment(env)
  return environment ? getExpectedBlobStoreId(environment) : undefined
}

export function getBlobStorageActualStoreId(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const token = env.BLOB_READ_WRITE_TOKEN
  return token ? parseBlobStorageTokenStoreId(token) ?? undefined : undefined
}
