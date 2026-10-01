'use client'

import { useState, useTransition } from 'react'
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
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { inviteStaff, reissueStaffInvitation, setStaffStatus, updateStaffAccess } from '@/app/actions/staff'

export interface StaffMember {
  user_id: string
  email: string
  full_name: string | null
  role: 'editor_publisher' | 'commercial_manager' | 'support_reviewer' | 'analyst'
  status: 'active' | 'suspended' | 'revoked'
  scope_mode: 'all' | 'selected'
  mfa_enabled: boolean
  scope_brand_ids: string[]
}
interface BrandOption { id: string; name: string }
interface Invitation { id: string; email: string; role: StaffMember['role']; scope_mode: 'all' | 'selected'; status: string; expires_at: string }

const ROLES: { id: StaffMember['role']; label: string }[] = [
  { id: 'editor_publisher', label: 'Editor / publisher' },
  { id: 'commercial_manager', label: 'Commercial manager' },
  { id: 'support_reviewer', label: 'Support / reviewer' },
  { id: 'analyst', label: 'Analyst' },
]

export function StaffClient({ staff, brands, invitations, totalBrands, invitationTtlDays }: { staff: StaffMember[]; brands: BrandOption[]; invitations: Invitation[]; totalBrands: number; invitationTtlDays: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<StaffMember['role']>('analyst')
  const [scopeMode, setScopeMode] = useState<'all' | 'selected'>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [reissueTarget, setReissueTarget] = useState<Invitation | null>(null)
  const [edits, setEdits] = useState<Record<string, { role: StaffMember['role']; scopeMode: 'all' | 'selected'; selected: string[] }>>(() => Object.fromEntries(staff.map((person) => [person.user_id, { role: person.role, scopeMode: person.scope_mode, selected: person.scope_brand_ids ?? [] }])))

  function refreshOn(result: { ok: boolean; error?: string }, success: string) {
    if (result.ok) { toast.success(success); router.refresh() }
    else toast.error(result.error ?? 'The change could not be saved.')
  }
  function submitInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await inviteStaff({ email, fullName, role, scopeMode, brandIds: scopeMode === 'all' ? [] : selected })
      if (result.ok) { toast.success('Invitation created. Staff access remains locked until TOTP setup.'); setEmail(''); setFullName(''); setSelected([]); router.refresh() }
      else toast.error(result.error ?? 'Could not invite staff member.')
    })
  }
  function save(person: StaffMember) {
    const edit = edits[person.user_id]
    startTransition(async () => {
      const result = await updateStaffAccess({ userId: person.user_id, role: edit.role, scopeMode: edit.scopeMode, brandIds: edit.scopeMode === 'all' ? [] : edit.selected })
      refreshOn(result, 'Role and broker scope saved')
    })
  }
  function changeStatus(person: StaffMember, status: StaffMember['status']) {
    startTransition(async () => refreshOn(await setStaffStatus({ userId: person.user_id, status }), status === 'active' ? 'Staff access restored' : 'Access removed and sessions invalidated'))
  }
  function reissueInvite() {
    if (!reissueTarget) return
    startTransition(async () => {
      const result = await reissueStaffInvitation({ id: reissueTarget.id })
      if (result.ok) {
        toast.success('Invitation reissued and new credentials emailed')
        setReissueTarget(null)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Could not reissue the invitation')
      }
    })
  }
  function updateEdit(id: string, patch: Partial<(typeof edits)[string]>) {
    setEdits((current) => ({ ...current, [id]: { ...current[id], ...patch } }))
  }
  function brandPicker(value: string[], onChange: (next: string[]) => void, id: string) {
    return <fieldset className="flex max-h-48 flex-col gap-2 overflow-auto rounded-md border border-border p-3"><legend className="px-1 text-xs text-muted-foreground">Broker scope ({value.length} selected)</legend>{brands.map((brand) => <label key={brand.id} className="flex min-h-8 items-center gap-2 text-sm"><input type="checkbox" checked={value.includes(brand.id)} onChange={(event) => onChange(event.target.checked ? [...value, brand.id] : value.filter((item) => item !== brand.id))} aria-label={`${id}: ${brand.name}`} />{brand.name}</label>)}</fieldset>
  }
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Staff &amp; access</h1><p className="mt-1 text-sm text-muted-foreground">All active staff accounts have full access to every admin area and broker. Role and broker scope are reference fields; TOTP is still required. Suspensions and revocations invalidate active sessions.</p></div>
      <Card className="p-5"><h2 className="text-lg font-semibold">Invite staff</h2><p className="mb-4 mt-1 text-sm text-muted-foreground">Invitations expire after {invitationTtlDays} {invitationTtlDays === 1 ? 'day' : 'days'}. A random temporary password is sent once; first sign-in requires a password change and authenticator enrollment. All staff receive full admin access regardless of role or broker scope.</p><form onSubmit={submitInvite} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-sm">Full name<Input required minLength={2} maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label className="flex flex-col gap-1.5 text-sm">Work email<Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-sm">Staff role (reference)<select className="h-10 rounded-md border border-input bg-background px-3" value={role} onChange={(event) => setRole(event.target.value as StaffMember['role'])}>{ROLES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="flex flex-col gap-1.5 text-sm">Broker scope (reference)<select className="h-10 rounded-md border border-input bg-background px-3" value={scopeMode} onChange={(event) => setScopeMode(event.target.value as 'all' | 'selected')}><option value="selected">Selected brokers</option><option value="all">All brokers</option></select></label></div>
        {scopeMode === 'selected' && brandPicker(selected, setSelected, 'Invite broker')}
        <Button type="submit" disabled={pending || !totalBrands}>Send staff invitation</Button>
      </form></Card>
      <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">Staff accounts <span className="text-sm font-normal text-muted-foreground">{staff.length}</span></h2>{staff.length === 0 ? <Card className="p-6 text-sm text-muted-foreground">No staff accounts have been invited.</Card> : staff.map((person) => {
        const edit = edits[person.user_id]
        return <Card key={person.user_id} className="flex flex-col gap-4 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{person.full_name || person.email}</p><p className="text-sm text-muted-foreground">{person.email}</p></div><div className="flex gap-2"><Badge variant={person.status === 'active' ? 'secondary' : 'outline'}>{person.status}</Badge><Badge variant={person.mfa_enabled ? 'secondary' : 'destructive'}>{person.mfa_enabled ? 'TOTP enabled' : 'TOTP required'}</Badge></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-sm">Staff role (reference)<select className="h-10 rounded-md border border-input bg-background px-3" value={edit?.role ?? person.role} onChange={(event) => updateEdit(person.user_id, { role: event.target.value as StaffMember['role'] })}>{ROLES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="flex flex-col gap-1.5 text-sm">Broker scope (reference)<select className="h-10 rounded-md border border-input bg-background px-3" value={edit?.scopeMode ?? person.scope_mode} onChange={(event) => updateEdit(person.user_id, { scopeMode: event.target.value as 'all' | 'selected' })}><option value="selected">Selected brokers</option><option value="all">All brokers</option></select></label></div>
          {edit?.scopeMode === 'selected' && brandPicker(edit.selected, (next) => updateEdit(person.user_id, { selected: next }), person.email)}
          <div className="flex flex-wrap gap-2"><Button size="sm" disabled={pending || person.status === 'revoked'} onClick={() => save(person)}>Save role &amp; scope</Button>{person.status === 'active' ? <Button size="sm" variant="outline" disabled={pending} onClick={() => changeStatus(person, 'suspended')}>Suspend</Button> : <Button size="sm" variant="outline" disabled={pending || person.status === 'revoked'} onClick={() => changeStatus(person, 'active')}>Reactivate</Button>}{person.status !== 'revoked' && <Button size="sm" variant="destructive" disabled={pending} onClick={() => changeStatus(person, 'revoked')}>Revoke &amp; sign out</Button>}</div>
        </Card>
      })}</section>
      <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">Invitations</h2>{invitations.length ? invitations.map((invitation) => <Card key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{invitation.email}</p><p className="text-sm text-muted-foreground">{ROLES.find((item) => item.id === invitation.role)?.label} · {invitation.scope_mode === 'all' ? 'All brokers' : 'Selected brokers'}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{invitation.status} · expires {new Date(invitation.expires_at).toLocaleDateString()}</Badge>{invitation.status === 'expired' && <Button size="sm" variant="outline" disabled={pending} onClick={() => setReissueTarget(invitation)}>Reissue</Button>}</div></Card>) : <Card className="p-6 text-sm text-muted-foreground">No pending or expired invitations.</Card>}</section>
      <AlertDialog open={reissueTarget !== null} onOpenChange={(open) => !open && setReissueTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reissue this staff invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              A new temporary password will be emailed to {reissueTarget?.email}. Their current sessions will be signed out, and the invitation will use the configured {invitationTtlDays}-day expiry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); reissueInvite() }}>
              Reissue invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
