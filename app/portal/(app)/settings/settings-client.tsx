'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile, changePassword, signOutEverywhere } from '@/app/actions/account'

export function SettingsClient({
  fullName,
  email,
  role,
}: {
  fullName: string
  email: string
  role: string
}) {
  const [name, setName] = useState(fullName)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [savingProfile, startProfile] = useTransition()
  const [savingPw, startPw] = useTransition()
  const [signingOut, startSignOut] = useTransition()

  function onSaveProfile() {
    startProfile(async () => {
      const fd = new FormData()
      fd.set('fullName', name)
      const res = await updateProfile(fd)
      if (res.ok) toast.success('Profile updated')
      else toast.error(res.error ?? 'Could not update profile')
    })
  }

  function onChangePassword() {
    if (pw !== pw2) {
      toast.error('Passwords do not match')
      return
    }
    startPw(async () => {
      const fd = new FormData()
      fd.set('password', pw)
      const res = await changePassword(fd)
      if (res.ok) {
        toast.success('Password changed')
        setPw('')
        setPw2('')
      } else {
        toast.error(res.error ?? 'Could not change password')
      }
    })
  }

  return (
    <div className="p-surface anim-fade-up anim-d-1 -mx-2 flex flex-col gap-6 rounded-[28px] px-6 py-6 sm:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name and sign-in email.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} readOnly disabled />
            <p className="text-xs text-muted-foreground">
              {role === 'admin' ? 'Administrator account' : 'Contact support to change your email'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <Button onClick={onSaveProfile} disabled={savingProfile || name.trim().length === 0}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Use at least 12 characters with upper, lower and a number.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pw">New password</Label>
            <Input
              id="pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pw2">Confirm new password</Label>
            <Input
              id="pw2"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Button onClick={onChangePassword} disabled={savingPw || pw.length < 12}>
              {savingPw ? 'Updating…' : 'Change password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Sign out of all devices where you are logged in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => startSignOut(() => signOutEverywhere())}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out everywhere'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
