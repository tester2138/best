'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { completeStaffMfaEnrollment } from '@/app/actions/staff'

type Enrollment = { totpURI: string; backupCodes: string[] }

function readBackupCodes(value: unknown): string[] {
  if (!value || typeof value !== 'object' || !('backupCodes' in value) || !Array.isArray(value.backupCodes)) return []
  return value.backupCodes.filter((code): code is string => typeof code === 'string')
}

function secretFromUri(totpURI: string): string {
  try {
    return new URL(totpURI).searchParams.get('secret') ?? ''
  } catch {
    return ''
  }
}

export function SecurityClient({
  email,
  mfaEnabled: initialMfaEnabled,
  setupPending,
  sessionFresh,
  invitationExpired,
  loginPath,
}: {
  email: string
  mfaEnabled: boolean
  setupPending: boolean
  sessionFresh: boolean
  invitationExpired: boolean
  loginPath: string
}) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [mfaEnabled, setMfaEnabled] = useState(initialMfaEnabled)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function beginEnrollment() {
    setError(null)
    startTransition(async () => {
      const result = setupPending
        ? await authClient.twoFactor.getTotpUri({ password })
        : await authClient.twoFactor.enable({ password, issuer: 'BestForex.io' })
      if (result.error || !result.data?.totpURI) {
        setError('Could not start authenticator setup. Check your password and try again.')
        return
      }
      setEnrollment({
        totpURI: result.data.totpURI,
        backupCodes: readBackupCodes(result.data),
      })
    })
  }

  function verifyEnrollment() {
    setError(null)
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the six-digit code shown in your authenticator app.')
      return
    }
    startTransition(async () => {
      const verified = await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice: false })
      if (verified.error) {
        setError('That authenticator code could not be accepted. Check the time on your device and try again.')
        return
      }

      let codes = enrollment?.backupCodes ?? []
      if (codes.length === 0) {
        const generated = await authClient.twoFactor.generateBackupCodes({ password })
        if (!generated.error) codes = readBackupCodes(generated.data)
      }
      const completed = await completeStaffMfaEnrollment()
      if (!completed.ok) {
        setError(completed.error ?? 'Authenticator setup could not be completed.')
        return
      }
      setBackupCodes(codes)
      setMfaEnabled(true)
      setEnrollment(null)
      setCode('')
      toast.success('Authenticator enabled. Staff access is now protected.')
      router.refresh()
    })
  }

  function rotateRecoveryCodes() {
    setError(null)
    startTransition(async () => {
      const result = await authClient.twoFactor.generateBackupCodes({ password })
      const codes = readBackupCodes(result.data)
      if (result.error || codes.length === 0) {
        setError('Could not regenerate recovery codes. Check your password and try again.')
        return
      }
      setBackupCodes(codes)
      setPassword('')
      toast.success('Recovery codes rotated. Previous codes no longer work.')
    })
  }

  function signOutForReauthentication() {
    startTransition(async () => {
      await authClient.signOut()
      window.location.replace(loginPath)
    })
  }

  const manualSecret = enrollment ? secretFromUri(enrollment.totpURI) : ''

  if (invitationExpired) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <p className="text-sm font-medium text-primary">BestForex.io staff</p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight">Invitation expired</h1>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Staff access is paused</CardTitle>
            <CardDescription>
              Your invitation expired before setup was completed. Ask an administrator to reissue it; access remains blocked until then.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={signOutForReauthentication} disabled={pending}>Sign out</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-primary">BestForex.io staff</p>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight">Account security</h1>
        <p className="mt-2 break-all text-sm text-muted-foreground">Signed in as {email}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Authenticator verification</CardTitle>
          <CardDescription>
            Staff access requires a verified authenticator. Backup codes are shown only after setup or rotation; store them somewhere secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {mfaEnabled && !sessionFresh ? (
            <>
              <p role="status" className="text-sm leading-relaxed text-muted-foreground">
                Your current session predates the verified authenticator. Sign out and sign in again with your authenticator to continue.
              </p>
              <Button onClick={signOutForReauthentication} disabled={pending}>Sign out and reauthenticate</Button>
            </>
          ) : mfaEnabled ? (
            <>
              <p role="status" className="text-sm leading-relaxed">Authenticator is enabled for this staff account.</p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="recovery-password">Current password to rotate recovery codes</Label>
                <Input id="recovery-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              <Button variant="outline" onClick={rotateRecoveryCodes} disabled={pending || password.length < 1}>
                Regenerate recovery codes
              </Button>
            </>
          ) : enrollment ? (
            <>
              <p className="text-sm leading-relaxed">Add this key to an authenticator app, then enter the current six-digit code.</p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="totp-secret">Authenticator setup key</Label>
                <Input id="totp-secret" value={manualSecret} readOnly autoComplete="off" aria-describedby="totp-secret-help" />
                <p id="totp-secret-help" className="text-xs leading-relaxed text-muted-foreground">
                  The key is a secret. Do not send it to anyone or enter it on another website.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="totp-code">Authenticator code</Label>
                <Input id="totp-code" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
              </div>
              <Button onClick={verifyEnrollment} disabled={pending || code.trim().length !== 6}>
                {pending ? 'Verifying…' : 'Verify and enable staff access'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed">Enter your password to begin TOTP setup. Your staff permissions stay unavailable until the code is verified.</p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input id="current-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              <Button onClick={beginEnrollment} disabled={pending || !password}>
                {pending ? 'Starting setup…' : setupPending ? 'Continue authenticator setup' : 'Set up authenticator'}
              </Button>
            </>
          )}

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {backupCodes.length > 0 ? (
            <section aria-live="polite" className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <h2 className="font-medium">Save your recovery codes</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">Each code works once. Rotating them invalidates this set.</p>
              <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((backupCode) => <li key={backupCode}>{backupCode}</li>)}
              </ul>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
