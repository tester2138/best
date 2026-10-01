import { queryOne } from '@/lib/portal/db'
import { requireStaff } from '@/lib/guards'
import { SettingsClient, type PortalSettings } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  await requireStaff('settings:manage')
  const settings = await queryOne<PortalSettings>(
    `select moderation_mode, max_active_offers, invitation_ttl_days, banned_terms
       from public.portal_settings where id = true`,
  )

  const initial: PortalSettings = settings ?? {
    moderation_mode: 'hybrid',
    max_active_offers: 3,
    invitation_ttl_days: 7,
    banned_terms: [],
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Portal-wide configuration</p>
      </div>
      <SettingsClient initial={initial} />
    </div>
  )
}
