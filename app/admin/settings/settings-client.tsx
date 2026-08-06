'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateSettings } from '@/app/actions/admin'

export interface PortalSettings {
  moderation_mode: 'off' | 'hybrid' | 'all'
  max_active_offers: number
  invitation_ttl_days: number
  banned_terms: string[]
}

export function SettingsClient({ initial }: { initial: PortalSettings }) {
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<PortalSettings['moderation_mode']>(initial.moderation_mode)
  const [maxOffers, setMaxOffers] = useState(String(initial.max_active_offers))
  const [ttl, setTtl] = useState(String(initial.invitation_ttl_days))
  const [banned, setBanned] = useState(initial.banned_terms.join('\n'))

  function save() {
    const terms = banned
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 100)
    startTransition(async () => {
      const res = await updateSettings({
        moderation_mode: mode,
        max_active_offers: Number(maxOffers),
        invitation_ttl_days: Number(ttl),
        banned_terms: terms,
      })
      if (res.ok) toast.success('Settings saved')
      else toast.error(res.error ?? 'Could not save settings')
    })
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card className="flex flex-col gap-2 p-5">
        <Label htmlFor="mode">Moderation mode</Label>
        <p className="text-sm text-muted-foreground">
          Off publishes instantly. Hybrid queues moderated sections and all offers/media. All
          queues every change.
        </p>
        <Select value={mode} onValueChange={(v) => setMode(v as PortalSettings['moderation_mode'])}>
          <SelectTrigger id="mode" className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-2 p-5">
          <Label htmlFor="max-offers">Max active offers</Label>
          <Input
            id="max-offers"
            type="number"
            min={1}
            max={10}
            value={maxOffers}
            onChange={(e) => setMaxOffers(e.target.value)}
            className="max-w-[8rem]"
          />
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <Label htmlFor="ttl">Invitation TTL (days)</Label>
          <Input
            id="ttl"
            type="number"
            min={1}
            max={30}
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            className="max-w-[8rem]"
          />
        </Card>
      </div>

      <Card className="flex flex-col gap-2 p-5">
        <Label htmlFor="banned">Banned terms</Label>
        <p className="text-sm text-muted-foreground">
          One term per line (max 100). Any published content containing these gets auto-flagged
          for moderation.
        </p>
        <Textarea
          id="banned"
          value={banned}
          onChange={(e) => setBanned(e.target.value)}
          rows={8}
          placeholder={'guaranteed\nrisk-free\nno loss'}
        />
        <div className="text-xs text-muted-foreground">
          <Badge variant="secondary">
            {banned.split('\n').map((t) => t.trim()).filter(Boolean).length} terms
          </Badge>
        </div>
      </Card>

      <div>
        <Button onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  )
}
