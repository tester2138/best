'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteAdCampaign, saveAdCampaign, setAdCampaignStatus } from '@/app/actions/admin-ads'
import {
  AD_CAMPAIGN_PLACEMENTS,
  AD_CAMPAIGN_SIZES,
  AD_CAMPAIGN_STATUSES,
  type AdCampaignRecord,
  type AdCampaignStatus,
} from '@/lib/ad-campaign-types'

interface CampaignForm {
  id: string | null
  campaignName: string
  campaignType: 'paid' | 'house'
  brandName: string
  placementKey: string
  imageUrl: string
  destinationUrl: string
  altText: string
  label: '' | 'Ad'
  desktopSize: string
  mobileSize: string
  priority: number
  status: AdCampaignStatus
  startsAt: string
  endsAt: string
}

const EMPTY_FORM: CampaignForm = {
  id: null,
  campaignName: '',
  campaignType: 'paid',
  brandName: '',
  placementKey: 'horizontal-1',
  imageUrl: '',
  destinationUrl: '',
  altText: '',
  label: 'Ad',
  desktopSize: '468x60',
  mobileSize: '468x60',
  priority: 1,
  status: 'draft',
  startsAt: '',
  endsAt: '',
}

const STATUS_BADGE: Record<AdCampaignStatus | 'scheduled' | 'ended', { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Active', variant: 'default' },
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  paused: { label: 'Paused', variant: 'outline' },
  ended: { label: 'Ended', variant: 'outline' },
  draft: { label: 'Draft', variant: 'secondary' },
  archived: { label: 'Archived', variant: 'destructive' },
}

function displayState(campaign: AdCampaignRecord, now: number): AdCampaignStatus | 'scheduled' | 'ended' {
  if (campaign.status !== 'active') return campaign.status
  if (campaign.startsAt && new Date(campaign.startsAt).getTime() > now) return 'scheduled'
  if (campaign.endsAt && new Date(campaign.endsAt).getTime() < now) return 'ended'
  return 'active'
}

/** ISO string -> value usable by <input type="datetime-local">, local time. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatSchedule(campaign: AdCampaignRecord): string {
  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : '—'
  if (!campaign.startsAt && !campaign.endsAt) return 'Always on'
  return `${fmt(campaign.startsAt)} → ${fmt(campaign.endsAt)}`
}

export function AdvertisingClient({
  campaigns,
  dbError,
  initialNow,
}: {
  campaigns: AdCampaignRecord[]
  dbError: boolean
  initialNow: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdCampaignRecord | null>(null)
  const [now, setNow] = useState(initialNow)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const serving = useMemo(() => {
    const map = new Map<string, AdCampaignRecord>()
    for (const c of campaigns) {
      if (c.status !== 'active') continue
      if (c.startsAt && new Date(c.startsAt).getTime() > now) continue
      if (c.endsAt && new Date(c.endsAt).getTime() < now) continue
      const current = map.get(c.placementKey)
      if (!current || c.priority < current.priority) map.set(c.placementKey, c)
    }
    return map
  }, [campaigns, now])

  function openCreate() {
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(campaign: AdCampaignRecord) {
    setForm({
      id: campaign.id,
      campaignName: campaign.campaignName,
      campaignType: campaign.campaignType,
      brandName: campaign.brandName,
      placementKey: campaign.placementKey,
      imageUrl: campaign.imageUrl,
      destinationUrl: campaign.destinationUrl,
      altText: campaign.altText,
      label: campaign.label,
      desktopSize: campaign.desktopSize,
      mobileSize: campaign.mobileSize ?? '',
      priority: campaign.priority,
      status: campaign.status,
      startsAt: isoToLocalInput(campaign.startsAt),
      endsAt: isoToLocalInput(campaign.endsAt),
    })
    setOpen(true)
  }

  function setField<K extends keyof CampaignForm>(key: K, value: CampaignForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit() {
    setSaving(true)
    try {
      const res = await saveAdCampaign({
        id: form.id,
        placementKey: form.placementKey,
        campaignName: form.campaignName,
        campaignType: form.campaignType,
        brandName: form.brandName,
        imageUrl: form.imageUrl,
        destinationUrl: form.destinationUrl,
        altText: form.altText,
        label: form.campaignType === 'paid' ? 'Ad' : form.label,
        desktopSize: form.desktopSize,
        mobileSize: form.mobileSize === '' ? null : form.mobileSize,
        priority: form.priority,
        status: form.status,
        startsAt: form.startsAt === '' ? null : new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt === '' ? null : new Date(form.endsAt).toISOString(),
      })
      if (res.ok) {
        toast.success(form.id ? 'Campaign updated' : 'Campaign created')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Could not save campaign')
      }
    } catch {
      toast.error('Could not save campaign. Check the dates and required fields.')
    } finally {
      setSaving(false)
    }
  }

  function setStatus(id: string, status: AdCampaignStatus) {
    startTransition(async () => {
      const res = await setAdCampaignStatus({ id, status })
      if (res.ok) {
        toast.success(`Campaign ${status}`)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Could not update campaign')
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteAdCampaign({ id })
      if (res.ok) {
        toast.success('Campaign deleted')
        setDeleteTarget(null)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Could not delete campaign')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Advertising</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Banner campaigns for the four site placements. The highest-priority
            active campaign serves each placement; otherwise the static house
            banner is shown.
          </p>
        </div>
        <Button onClick={openCreate} disabled={dbError}>New campaign</Button>
      </div>

      {dbError && (
        <Alert variant="destructive">
          <AlertTitle>Campaigns could not be loaded</AlertTitle>
          <AlertDescription>
            The ad campaign table is unavailable. Verify the database migration
            has been applied, then reload this page.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AD_CAMPAIGN_PLACEMENTS.map((placement) => {
          const live = serving.get(placement)
          return (
            <Card key={placement} className="flex flex-col gap-1 p-4">
              <span className="font-mono text-xs text-muted-foreground">{placement}</span>
              <span className="text-sm font-medium">
                {live ? live.campaignName : 'House banner (static)'}
              </span>
              <span className="text-xs text-muted-foreground">
                {live ? live.brandName : 'Advertise with BestForex.io'}
              </span>
            </Card>
          )
        })}
      </div>

      {campaigns.length === 0 && !dbError ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No campaigns yet. Create the first one to take over a placement from
          the static house banners.
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const state = displayState(campaign, now)
                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{campaign.campaignName}</span>
                        <span className="text-xs text-muted-foreground">
                          {campaign.brandName} · {campaign.desktopSize}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{campaign.placementKey}</TableCell>
                    <TableCell>
                      <Badge variant={campaign.campaignType === 'paid' ? 'default' : 'secondary'}>
                        {campaign.campaignType}
                      </Badge>
                    </TableCell>
                    <TableCell>{campaign.priority}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[state].variant}>{STATUS_BADGE[state].label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatSchedule(campaign)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(campaign)}>
                          Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={pending}>
                              Manage
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {AD_CAMPAIGN_STATUSES.filter((s) => s !== campaign.status).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => setStatus(campaign.id, s)}>
                                Set {STATUS_BADGE[s].label.toLowerCase()}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(campaign)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.campaignName} will be permanently removed. The placement will fall back to its house banner unless another active campaign is serving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                if (deleteTarget) remove(deleteTarget.id)
              }}
            >
              Delete campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit campaign' : 'New campaign'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="campaignName">Campaign name</Label>
              <Input
                id="campaignName"
                value={form.campaignName}
                onChange={(e) => setField('campaignName', e.target.value)}
                placeholder="XM Q4 homepage takeover"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="brandName">Brand name</Label>
              <Input
                id="brandName"
                value={form.brandName}
                onChange={(e) => setField('brandName', e.target.value)}
                placeholder="XM"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Placement</Label>
              <Select value={form.placementKey} onValueChange={(v) => setField('placementKey', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {AD_CAMPAIGN_PLACEMENTS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Campaign type</Label>
              <Select
                value={form.campaignType}
                onValueChange={(value) => {
                  const campaignType = value as 'paid' | 'house'
                  setField('campaignType', campaignType)
                  if (campaignType === 'paid') setField('label', 'Ad')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="paid">Paid (labelled &quot;Ad&quot;)</SelectItem>
                    <SelectItem value="house">House (self-promo)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Disclosure label</Label>
              <Select
                value={form.label || 'none'}
                disabled={form.campaignType === 'paid'}
                onValueChange={(value) => setField('label', value === 'none' ? '' : 'Ad')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Ad">Ad</SelectItem>
                    <SelectItem value="none">No label (house only)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={form.imageUrl}
                onChange={(e) => setField('imageUrl', e.target.value)}
                placeholder="/ads/banner-468x60-1.jpg or https://..."
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="destinationUrl">Destination URL</Label>
              <Input
                id="destinationUrl"
                value={form.destinationUrl}
                onChange={(e) => setField('destinationUrl', e.target.value)}
                placeholder="https://www.example.com/?ref=bestforex or /media-kit"
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="altText">Alt text</Label>
              <Input
                id="altText"
                value={form.altText}
                onChange={(e) => setField('altText', e.target.value)}
                placeholder="Trade with XM — $30 no deposit bonus"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Desktop size</Label>
              <Select value={form.desktopSize} onValueChange={(v) => setField('desktopSize', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {AD_CAMPAIGN_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Mobile size</Label>
              <Select
                value={form.mobileSize || 'none'}
                onValueChange={(v) => setField('mobileSize', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">Same as desktop</SelectItem>
                    {AD_CAMPAIGN_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="priority">Priority (1 serves first)</Label>
              <Input
                id="priority"
                type="number"
                min={1}
                value={form.priority}
                onChange={(e) => setField('priority', Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setField('status', v as AdCampaignStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {AD_CAMPAIGN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_BADGE[s].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="startsAt">Starts at (optional)</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setField('startsAt', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endsAt">Ends at (optional)</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setField('endsAt', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Saving...' : 'Save campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
