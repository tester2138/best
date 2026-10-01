'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Gift, Plus } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { deleteAdminOffer, saveAdminOffer, setAdminOfferStatus } from '@/app/actions/admin-offers'
import {
  ADMIN_OFFER_STATUSES,
  ADMIN_OFFER_TYPES,
  type AdminOfferRecord,
  type AdminOfferStatus,
  type AdminOfferType,
} from '@/lib/admin-offer-types'

interface OfferForm {
  id: string | null
  brokerId: string
  brokerName: string
  brokerLogo: string
  title: string
  description: string
  value: string
  code: string
  type: AdminOfferType
  terms: string
  affiliateUrl: string
  isFeatured: boolean
  isExclusive: boolean
  startsAt: string
  endsAt: string
  status: AdminOfferStatus
  sortOrder: number
}

const EMPTY_FORM: OfferForm = {
  id: null,
  brokerId: '',
  brokerName: '',
  brokerLogo: '',
  title: '',
  description: '',
  value: '',
  code: '',
  type: 'other',
  terms: '',
  affiliateUrl: '',
  isFeatured: false,
  isExclusive: false,
  startsAt: '',
  endsAt: '',
  status: 'draft',
  sortOrder: 0,
}

const STATUS_BADGE: Record<AdminOfferStatus | 'scheduled' | 'ended', { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Active', variant: 'default' },
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  paused: { label: 'Paused', variant: 'outline' },
  ended: { label: 'Ended', variant: 'outline' },
  draft: { label: 'Draft', variant: 'secondary' },
  archived: { label: 'Archived', variant: 'destructive' },
}

const TYPE_LABELS: Record<AdminOfferType, string> = {
  deposit: 'Deposit bonus',
  'no-deposit': 'No-deposit bonus',
  cashback: 'Cashback',
  rebate: 'Rebate',
  other: 'Other promotion',
}

function displayState(offer: AdminOfferRecord): AdminOfferStatus | 'scheduled' | 'ended' {
  if (offer.status !== 'active') return offer.status
  const now = Date.now()
  if (offer.startsAt && new Date(offer.startsAt).getTime() > now) return 'scheduled'
  if (offer.endsAt && new Date(offer.endsAt).getTime() < now) return 'ended'
  return 'active'
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatSchedule(offer: AdminOfferRecord): string {
  const format = (value: string | null) =>
    value
      ? `${new Date(value).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC`
      : '—'
  if (!offer.startsAt && !offer.endsAt) return 'No schedule'
  return `${format(offer.startsAt)} → ${format(offer.endsAt)}`
}

export function OffersClient({ offers, dbError }: { offers: AdminOfferRecord[]; dbError: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<AdminOfferRecord | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AdminOfferStatus>('all')

  const visibleOffers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return offers.filter((offer) => {
      if (statusFilter !== 'all' && offer.status !== statusFilter) return false
      if (!query) return true
      return [offer.title, offer.brokerName, offer.brokerId, offer.id]
        .some((value) => value.toLowerCase().includes(query))
    })
  }, [offers, search, statusFilter])

  function setField<K extends keyof OfferForm>(key: K, value: OfferForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(offer: AdminOfferRecord) {
    setForm({
      id: offer.id,
      brokerId: offer.brokerId,
      brokerName: offer.brokerName,
      brokerLogo: offer.brokerLogo ?? '',
      title: offer.title,
      description: offer.description,
      value: offer.value,
      code: offer.code ?? '',
      type: offer.type,
      terms: offer.terms,
      affiliateUrl: offer.affiliateUrl,
      isFeatured: offer.isFeatured,
      isExclusive: offer.isExclusive,
      startsAt: isoToLocalInput(offer.startsAt),
      endsAt: isoToLocalInput(offer.endsAt),
      status: offer.status,
      sortOrder: offer.sortOrder,
    })
    setDialogOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await saveAdminOffer({
        ...form,
        brokerLogo: form.brokerLogo.trim(),
        code: form.code.trim(),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      })
      if (!result.ok) {
        toast.error(result.error ?? 'Could not save offer')
        return
      }
      toast.success(form.id ? 'Offer updated' : 'Offer created')
      setDialogOpen(false)
      router.refresh()
    } catch {
      toast.error('Could not save offer. Check the dates and required fields.')
    } finally {
      setSaving(false)
    }
  }

  function setStatus(id: string, status: AdminOfferStatus) {
    startTransition(async () => {
      const result = await setAdminOfferStatus({ id, status })
      if (!result.ok) {
        toast.error(result.error ?? 'Could not update offer')
        return
      }
      toast.success(`Offer ${status}`)
      router.refresh()
    })
  }

  function removeOffer() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteAdminOffer({ id: deleteTarget.id })
      if (!result.ok) {
        toast.error(result.error ?? 'Could not delete offer')
        return
      }
      toast.success('Offer deleted')
      setDeleteTarget(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Offers &amp; promotions</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Manage public promotions across the offers directory, homepage, and broker profiles. Sponsored placement stays separate from editorial ratings.
          </p>
        </div>
        <Button onClick={openCreate} disabled={dbError}>
          <Plus data-icon="inline-start" /> New offer
        </Button>
      </div>

      {dbError && (
        <Alert variant="destructive">
          <AlertTitle>Offers could not be loaded</AlertTitle>
          <AlertDescription>
            The offer management table is unavailable. Existing public pages use their static fallback until the staging schema connection is restored.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Promotion inventory</CardTitle>
            <CardDescription>{offers.length} offers stored in the campaign catalog</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Input
              aria-label="Search offers"
              placeholder="Search offers or brokers"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="sm:w-64"
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | AdminOfferStatus)}>
              <SelectTrigger aria-label="Filter by status" className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ADMIN_OFFER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_BADGE[status].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {visibleOffers.length === 0 ? (
            <Empty className="rounded-md border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Gift /></EmptyMedia>
                <EmptyTitle>{offers.length === 0 ? 'No offers yet' : 'No matching offers'}</EmptyTitle>
                <EmptyDescription>
                  {offers.length === 0
                    ? 'Add a broker promotion to publish it to the public offers page and eligible broker placements.'
                    : 'Adjust the search or status filter to find another promotion.'}
                </EmptyDescription>
              </EmptyHeader>
              {offers.length === 0 && (
                <EmptyContent>
                  <Button onClick={openCreate} disabled={dbError}>Create first offer</Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Offer</TableHead>
                    <TableHead>Broker</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOffers.map((offer) => {
                    const state = displayState(offer)
                    return (
                      <TableRow key={offer.id}>
                        <TableCell className="max-w-64">
                          <div className="flex flex-col gap-1">
                            <span className="truncate font-medium">{offer.title}</span>
                            <span className="text-xs text-muted-foreground">{offer.value}{offer.code ? ` · Code ${offer.code}` : ''}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{offer.brokerName}</span>
                            <span className="font-mono text-xs text-muted-foreground">/{offer.brokerId}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{TYPE_LABELS[offer.type]}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {offer.isFeatured && <Badge variant="secondary">Featured</Badge>}
                            {offer.isExclusive && <Badge>Exclusive</Badge>}
                            {!offer.isFeatured && !offer.isExclusive && <span className="text-xs text-muted-foreground">Standard</span>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={STATUS_BADGE[state].variant}>{STATUS_BADGE[state].label}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatSchedule(offer)}</TableCell>
                        <TableCell>{offer.sortOrder}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(offer)}>Edit</Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={pending}>Manage</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                  {ADMIN_OFFER_STATUSES.filter((status) => status !== offer.status).map((status) => (
                                    <DropdownMenuItem key={status} onClick={() => setStatus(offer.id, status)}>
                                      Set {STATUS_BADGE[status].label.toLowerCase()}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(offer)}>
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title} will be permanently removed from the offers directory and broker profile placements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                removeOffer()
              }}
            >
              Delete offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit offer' : 'New offer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="offer-broker-id">Broker slug</FieldLabel>
                <Input id="offer-broker-id" required maxLength={120} value={form.brokerId} onChange={(event) => setField('brokerId', event.target.value)} placeholder="capital-com" />
                <FieldDescription>Use the public /brokers/{'{slug}'} route.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-broker-name">Broker name</FieldLabel>
                <Input id="offer-broker-name" required maxLength={200} value={form.brokerName} onChange={(event) => setField('brokerName', event.target.value)} placeholder="Capital.com" />
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-title">Offer title</FieldLabel>
                <Input id="offer-title" required maxLength={200} value={form.title} onChange={(event) => setField('title', event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-value">Offer value</FieldLabel>
                <Input id="offer-value" required maxLength={100} value={form.value} onChange={(event) => setField('value', event.target.value)} placeholder="Up to $500" />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="offer-description">Description</FieldLabel>
                <Textarea id="offer-description" required maxLength={1000} rows={3} value={form.description} onChange={(event) => setField('description', event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-type">Promotion type</FieldLabel>
                <Select value={form.type} onValueChange={(value) => setField('type', value as AdminOfferType)}>
                  <SelectTrigger id="offer-type"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{ADMIN_OFFER_TYPES.map((type) => <SelectItem key={type} value={type}>{TYPE_LABELS[type]}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-code">Promo code (optional)</FieldLabel>
                <Input id="offer-code" maxLength={100} value={form.code} onChange={(event) => setField('code', event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-logo">Broker logo path (optional)</FieldLabel>
                <Input id="offer-logo" maxLength={2048} value={form.brokerLogo} onChange={(event) => setField('brokerLogo', event.target.value)} placeholder="/logos/brokers/example.svg" />
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-affiliate-url">Affiliate URL</FieldLabel>
                <Input id="offer-affiliate-url" type="url" required maxLength={2048} value={form.affiliateUrl} onChange={(event) => setField('affiliateUrl', event.target.value)} placeholder="https://broker.example/offer" />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="offer-terms">Terms</FieldLabel>
                <Textarea id="offer-terms" required maxLength={2000} rows={3} value={form.terms} onChange={(event) => setField('terms', event.target.value)} />
              </Field>
            </FieldGroup>

            <FieldSet>
              <FieldLegend variant="label">Promotion placement</FieldLegend>
              <FieldGroup className="grid gap-3 sm:grid-cols-2">
                <Field orientation="horizontal">
                  <Checkbox id="offer-featured" checked={form.isFeatured} onCheckedChange={(checked) => setField('isFeatured', checked === true)} />
                  <FieldContent>
                    <FieldLabel htmlFor="offer-featured">Featured offer</FieldLabel>
                    <FieldDescription>Include in the homepage offer strip.</FieldDescription>
                  </FieldContent>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox id="offer-exclusive" checked={form.isExclusive} onCheckedChange={(checked) => setField('isExclusive', checked === true)} />
                  <FieldContent>
                    <FieldLabel htmlFor="offer-exclusive">Exclusive promotion</FieldLabel>
                    <FieldDescription>Mark as an exclusive broker deal.</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="offer-status">Status</FieldLabel>
                <Select value={form.status} onValueChange={(value) => setField('status', value as AdminOfferStatus)}>
                  <SelectTrigger id="offer-status"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{ADMIN_OFFER_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_BADGE[status].label}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-order">Sort order (lower appears first)</FieldLabel>
                <Input id="offer-order" type="number" min={0} max={999999} required value={form.sortOrder} onChange={(event) => setField('sortOrder', Number(event.target.value))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-starts">Starts at (optional)</FieldLabel>
                <Input id="offer-starts" type="datetime-local" value={form.startsAt} onChange={(event) => setField('startsAt', event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-ends">Ends at (optional)</FieldLabel>
                <Input id="offer-ends" type="datetime-local" value={form.endsAt} onChange={(event) => setField('endsAt', event.target.value)} />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save offer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
