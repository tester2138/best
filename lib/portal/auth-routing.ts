export type AuthSurface = 'admin' | 'business'

export const AUTH_SURFACE_PATHS: Record<
  AuthSurface,
  {
    home: string
    login: string
    forgotPassword: string
    reset: string
    setPassword: string
  }
> = {
  admin: {
    home: '/admin',
    login: '/admin/login',
    forgotPassword: '/admin/forgot-password',
    reset: '/admin/reset',
    setPassword: '/admin/set-password',
  },
  business: {
    home: '/business',
    login: '/business/login',
    forgotPassword: '/business/forgot-password',
    reset: '/business/reset',
    setPassword: '/business/set-password',
  },
}

function isPathOrDescendant(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

export function getAuthSurface(value: unknown): AuthSurface {
  return value === 'admin' ? 'admin' : 'business'
}

export function getPostLoginAuthSurface(
  requestedSurface: AuthSurface,
  hasStaffAccess: boolean,
): AuthSurface {
  return hasStaffAccess ? 'admin' : requestedSurface
}

export function getAuthSurfaceForPath(pathname: string): AuthSurface | null {
  if (isPathOrDescendant(pathname, AUTH_SURFACE_PATHS.admin.home)) return 'admin'
  if (isPathOrDescendant(pathname, AUTH_SURFACE_PATHS.business.home)) return 'business'
  return null
}

export function isAuthSurfaceOpenPath(surface: AuthSurface, pathname: string): boolean {
  const paths = AUTH_SURFACE_PATHS[surface]
  return [paths.login, paths.forgotPassword, paths.reset].some((path) =>
    isPathOrDescendant(pathname, path),
  )
}

export function isAuthSurfaceFlowPath(surface: AuthSurface, pathname: string): boolean {
  const paths = AUTH_SURFACE_PATHS[surface]
  return [
    paths.login,
    paths.forgotPassword,
    paths.reset,
    paths.setPassword,
  ].some((path) => isPathOrDescendant(pathname, path))
}

export function getSafeAuthNextPath(surface: AuthSurface, value: unknown): string {
  const paths = AUTH_SURFACE_PATHS[surface]
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return paths.home
  }

  try {
    const parsed = new URL(value, 'https://bestforex.invalid')
    if (
      parsed.origin !== 'https://bestforex.invalid' ||
      /%2f|%5c/i.test(parsed.pathname) ||
      (!isPathOrDescendant(parsed.pathname, paths.home)) ||
      isPathOrDescendant(parsed.pathname, paths.login)
    ) {
      return paths.home
    }
    return parsed.pathname
  } catch {
    return paths.home
  }
}
