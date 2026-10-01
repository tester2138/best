import { notFound } from 'next/navigation'
import { hasGlobalStaffScope, requireStaff } from '@/lib/guards'
import {
  getFallbackSiteBannerSettings,
  listSiteBannerSettings,
} from '@/lib/ad-campaigns'
import { SiteBannersClient } from './site-banners-client'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Site banners · BestForex Admin',
  robots: { index: false, follow: false },
}

export default async function SiteBannersPage() {
  const actor = await requireStaff('brokers:manage')
  if (!(await hasGlobalStaffScope(actor))) notFound()

  let banners = getFallbackSiteBannerSettings()
  let dbError = false
  try {
    banners = await listSiteBannerSettings()
  } catch (error) {
    console.error('[v0] site banner settings load failed:', error)
    dbError = true
  }

  return <SiteBannersClient banners={banners} dbError={dbError} />
}
