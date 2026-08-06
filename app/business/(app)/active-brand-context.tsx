'use client'

import { createContext, useContext } from 'react'

export interface ActiveBrand {
  brandId: string
  slug: string
  name: string
  /** false when the brand is paused or locked — write UIs disable themselves. */
  canWrite: boolean
}

const Ctx = createContext<ActiveBrand | null>(null)

export function ActiveBrandProvider({
  value,
  children,
}: {
  value: ActiveBrand
  children: React.ReactNode
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useActiveBrand(): ActiveBrand {
  const v = useContext(Ctx)
  if (!v) throw new Error('useActiveBrand must be used within ActiveBrandProvider')
  return v
}
