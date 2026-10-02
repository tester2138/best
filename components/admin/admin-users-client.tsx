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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createAdminAccount, removeAdminAccount } from '@/app/actions/admin-users'

export interface AdminAccessUser {
  id: string
  email: string
  fullName: string | null
  accessLabel: string
  isFullAccess: boolean
  canRemove: boolean
}

export function AdminUsersClient({
  admins,
  showPageHeading = false,
}: {
  admins: AdminAccessUser[]
  showPageHeading?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [removeTarget, setRemoveTarget] = useState<AdminAccessUser | null>(null)

  function submitAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await createAdminAccount({ email, password })
      if (result.ok) {
        toast.success('Admin account created.')
        setEmail('')
        setPassword('')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Could not create Admin account.')
      }
    })
  }

  function confirmRemove() {
    if (!removeTarget) return
    startTransition(async () => {
      const result = await removeAdminAccount({ userId: removeTarget.id })
      if (result.ok) {
        toast.success('Admin access removed and active sessions signed out.')
        setRemoveTarget(null)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Could not remove Admin access.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {showPageHeading ? (
        <header className="admin-page-heading">
          <p className="admin-eyebrow">Administration</p>
          <h1 className="text-2xl font-semibold tracking-tight">Admins &amp; access</h1>
          <p className="text-sm text-muted-foreground">
            Manage Admin accounts and review everyone with current admin access.
          </p>
        </header>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create an Admin</CardTitle>
          <CardDescription>
            Admin-role accounts can manage Admin accounts here. Full-access accounts can open every
            section and view everything in the Admin Panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitAdmin} className="flex flex-col gap-4">
            <FieldGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
              <Field>
                <FieldLabel htmlFor="new-admin-email">Email address</FieldLabel>
                <Input
                  id="new-admin-email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  disabled={pending}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-admin-password">Password</FieldLabel>
                <Input
                  id="new-admin-password"
                  type="password"
                  autoComplete="new-password"
                  aria-describedby="new-admin-password-help"
                  minLength={12}
                  maxLength={72}
                  required
                  disabled={pending}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <FieldDescription id="new-admin-password-help">
                  Use at least 12 characters with uppercase, lowercase, and a number.
                </FieldDescription>
              </Field>
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Create Admin'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="admin-users-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="admin-users-heading" className="text-lg font-semibold">
              Users with admin access
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Removing an Admin disables their admin access and signs them out; their account and
              existing records are retained.
            </p>
          </div>
          <Badge variant="outline">{admins.length}</Badge>
        </div>

        {admins.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No users currently have admin access.</Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {admins.map((admin) => (
              <li key={admin.id}>
                <Card className="gap-0 py-0">
                  <CardHeader className="gap-1 py-4">
                    <CardTitle className="break-all text-base">
                      {admin.fullName || admin.email}
                    </CardTitle>
                    {admin.fullName ? <CardDescription className="break-all">{admin.email}</CardDescription> : null}
                  </CardHeader>
                  <CardFooter className="flex-wrap justify-between gap-3 border-t py-3">
                    <Badge variant={admin.isFullAccess ? 'default' : 'secondary'}>
                      {admin.accessLabel}
                    </Badge>
                    {admin.canRemove ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => setRemoveTarget(admin)}
                      >
                        Remove Admin access
                      </Button>
                    ) : null}
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this Admin&apos;s access?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.email} will lose Admin access and all active sessions will be signed
              out. Their account and authored records will remain available to preserve existing
              business and audit history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                confirmRemove()
              }}
            >
              Remove Admin access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
