'use client'

import { useState, useMemo, useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { assignBrand } from '@/app/actions/admin'
import { searchCatalogAction } from '@/app/actions/catalog'
import type { CatalogEntry } from '@/lib/catalog'

export interface BrandRow {
  id: string
  slug: string
  name: string
  is_claimed: boolean
  portal_access: 'active' | 'paused'
  portal_locked: boolean
  renewal_date: string | null
  member_email: string | null
  last_publish: string | null
  verification_status: 'verified' | 'unverified'
  is_sponsored: boolean
  is_featured: boolean
  display_rank: number | null
  rating_score: number | string | null
  is_duplicate: boolean
  has_database_record: boolean
  profile_href?: string
}

export interface InitialAssignment {
  claimRequestId: string
  entry: CatalogEntry
  email: string
  contactName: string
}

function AccessPill({ row }: { row: BrandRow }) {
  if (row.portal_locked) return <Badge variant="destructive">Locked</Badge>
  if (row.portal_access === 'paused') return <Badge variant="secondary">Paused</Badge>
  return <Badge>Active</Badge>
}

export function BrandsClient({
  brands,
  canAssign,
  initialAssignment = null,
}: {
  brands: BrandRow[]
  canAssign: boolean
  initialAssignment?: InitialAssignment | null
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(Boolean(initialAssignment))
  const [dialogInitial, setDialogInitial] = useState(initialAssignment)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return brands
    return brands.filter(
      (b) => b.name.toLowerCase().includes(s) || b.slug.toLowerCase().includes(s),
    )
  }, [q, brands])

  function openManualAssignment() {
    setDialogInitial(null)
    setOpen(true)
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen && dialogInitial) {
      setDialogInitial(null)
      router.replace('/admin/brands', { scroll: false })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or slug"
          className="max-w-xs"
          aria-label="Search brands"
        />
        {canAssign ? <Button onClick={openManualAssignment}>Assign a brand</Button> : null}
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Renewal</TableHead>
              <TableHead>Last publish</TableHead>
              <TableHead className="sr-only">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No brands found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-xs text-muted-foreground">/{b.slug}</span>
                    <div className="flex flex-wrap gap-1">
                      {!b.has_database_record && <Badge variant="outline">Catalog only</Badge>}
                      {b.is_sponsored && <Badge>Sponsored</Badge>}
                      {b.is_featured && <Badge variant="secondary">Featured</Badge>}
                      {b.is_duplicate && <Badge variant="destructive">Excluded duplicate</Badge>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <AccessPill row={b} />
                    <Badge variant={b.verification_status === 'verified' ? 'secondary' : 'outline'}>
                      {b.verification_status}
                    </Badge>
                    {b.is_claimed && <Badge variant="outline">Claimed</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {b.member_email ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm">
                  {b.renewal_date
                    ? new Date(b.renewal_date).toLocaleDateString('en-US', { dateStyle: 'medium' })
                    : '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {b.last_publish
                    ? new Date(b.last_publish).toLocaleDateString('en-US', { dateStyle: 'medium' })
                    : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={b.profile_href ?? `/admin/brands/${b.has_database_record ? b.id : b.slug}/profile`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Edit profile
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AssignDialog
        key={dialogInitial?.claimRequestId ?? 'manual'}
        open={open}
        onOpenChange={handleDialogOpenChange}
        initial={dialogInitial}
      />
    </div>
  )
}

function hostFromWebsite(website: string | null): string | null {
  if (!website) return null
  try {
    return new URL(website).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function AssignDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: InitialAssignment | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [term, setTerm] = useState(initial?.entry.name ?? '')
  const [results, setResults] = useState<CatalogEntry[]>([])
  const [selected, setSelected] = useState<CatalogEntry | null>(initial?.entry ?? null)
  const [email, setEmail] = useState(initial?.email ?? '')
  const [contactName, setContactName] = useState(initial?.contactName ?? '')
  const [domains, setDomains] = useState<string[]>(() => {
    const domain = hostFromWebsite(initial?.entry.website ?? null)
    return domain ? [domain] : []
  })
  const [domainInput, setDomainInput] = useState('')
  const [override, setOverride] = useState(false)
  const [mismatch, setMismatch] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced catalog search (300ms, min 2 chars) — Blueprint 12.2.
  useEffect(() => {
    if (selected) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (term.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => {
      searchCatalogAction(term).then((res) => {
        if (res.ok && res.data) setResults(res.data)
      })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [term, selected])

  function reset() {
    setTerm('')
    setResults([])
    setSelected(null)
    setEmail('')
    setContactName('')
    setDomains([])
    setDomainInput('')
    setOverride(false)
    setMismatch(false)
    setFieldError(null)
  }

  function pick(entry: CatalogEntry) {
    setSelected(entry)
    setResults([])
    setTerm(entry.name)
    const host = hostFromWebsite(entry.website)
    setDomains(host ? [host] : [])
  }

  function addDomain() {
    const d = domainInput.trim().toLowerCase()
    if (d && !domains.includes(d)) setDomains([...domains, d])
    setDomainInput('')
  }

  function submit() {
    setFieldError(null)
    if (!selected) {
      setFieldError('Pick a broker from the catalog first.')
      return
    }
    if (!email.trim() || domains.length === 0) {
      setFieldError('Email and at least one official domain are required.')
      return
    }
    startTransition(async () => {
      const res = await assignBrand({
        slug: selected.slug,
        name: selected.name,
        website: selected.website,
        email: email.trim(),
        contactName: contactName.trim() || selected.name,
        officialDomains: domains,
        overrideDomainMismatch: override,
        claimRequestId: initial?.claimRequestId,
      })
      if (res.ok) {
        toast.success(
          res.data?.existingUser
            ? 'Brand added to the existing user.'
            : 'Brand assigned and invitation sent.',
        )
        reset()
        onOpenChange(false)
        router.refresh()
        return
      }
      // domain_mismatch surfaces the "Assign anyway" checkbox.
      const isMismatch = res.issues?.some((i) => i.message === 'domain_mismatch')
      if (isMismatch) {
        setMismatch(true)
        setFieldError('Email domain does not match the official domains.')
      } else {
        setFieldError(res.error ?? 'Could not assign the brand.')
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Complete profile claim' : 'Assign a brand'}</DialogTitle>
          <DialogDescription>
            {initial
              ? 'Confirm the representative and official email domain to provision access for this claim.'
              : 'Search the directory, then invite a broker to manage the profile.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="catalog-search">Broker</Label>
            <Input
              id="catalog-search"
              value={term}
              disabled={Boolean(initial?.claimRequestId)}
              onChange={(e) => {
                setTerm(e.target.value)
                setSelected(null)
              }}
              placeholder="Search by name or slug"
              autoComplete="off"
            />
            {results.length > 0 && !selected && (
              <div className="max-h-48 overflow-auto rounded-md border border-border">
                {results.map((r) => (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() => pick(r)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">
                      /{r.slug}
                      {r.website ? ` · ${r.website}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assign-contact-name">Contact name</Label>
                <Input
                  id="assign-contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Broker representative"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assign-email">Broker email</Label>
                <Input
                  id="assign-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@broker.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assign-domain">Official domains</Label>
                {initial ? (
                  <p className="text-xs text-muted-foreground">
                    Verify the organization&apos;s domain, not just the requester&apos;s email domain.
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Input
                    id="assign-domain"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        e.preventDefault()
                        addDomain()
                      }
                    }}
                    placeholder="broker.com"
                  />
                  <Button type="button" variant="secondary" onClick={addDomain}>
                    Add
                  </Button>
                </div>
                {domains.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {domains.map((d) => (
                      <Badge key={d} variant="secondary" className="gap-1">
                        {d}
                        <button
                          type="button"
                          onClick={() => setDomains(domains.filter((x) => x !== d))}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${d}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {mismatch && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <Checkbox
                    id="override"
                    checked={override}
                    onCheckedChange={(v) => setOverride(v === true)}
                  />
                  <Label htmlFor="override" className="text-sm font-normal leading-snug">
                    The email domain does not match the official domains. Assign anyway.
                  </Label>
                </div>
              )}
            </>
          )}

          {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !selected}>
            {pending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
