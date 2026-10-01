'use client'

import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { saveAdminEditorialAuthor, uploadEditorialImage } from '@/app/actions/admin-editorial'
import type { AdminEditorialAuthor } from '@/lib/admin-editorial'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type AuthorDraft = {
  slug: string
  name: string
  role: string
  bio: string
  avatar: string
  beatText: string
  sameAsText: string
  isActive: boolean
}

function splitLines(value: string): string[] {
  return value.split(/[\n,]/).map((part) => part.trim()).filter(Boolean)
}

function toDraft(author?: AdminEditorialAuthor): AuthorDraft {
  return {
    slug: author?.slug ?? '',
    name: author?.name ?? '',
    role: author?.role ?? '',
    bio: author?.bio ?? '',
    avatar: author?.avatar ?? '',
    beatText: (author?.beat ?? []).join('\n'),
    sameAsText: (author?.sameAs ?? []).join('\n'),
    isActive: author?.isActive ?? true,
  }
}

export function AuthorForm({ author }: { author?: AdminEditorialAuthor }) {
  const router = useRouter()
  const [draft, setDraft] = useState(() => toDraft(author))
  const [slugTouched, setSlugTouched] = useState(Boolean(author))
  const [isPending, startTransition] = useTransition()
  const originalSlug = author?.slug ?? null
  const set = <Key extends keyof AuthorDraft>(key: Key, value: AuthorDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleNameChange(value: string) {
    set('name', value)
    if (!slugTouched) set('slug', value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.set('file', file)
    startTransition(async () => {
      const result = await uploadEditorialImage(formData)
      if (!result.ok || !result.data) {
        toast.error(result.ok ? 'The upload did not return a URL.' : result.error)
        input.value = ''
        return
      }
      set('avatar', result.data.url)
      toast.success('Author image uploaded and optimized.')
      input.value = ''
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await saveAdminEditorialAuthor({
        originalSlug,
        slug: draft.slug,
        name: draft.name,
        role: draft.role,
        bio: draft.bio,
        avatar: draft.avatar,
        beat: splitLines(draft.beatText),
        sameAs: splitLines(draft.sameAsText),
        isActive: draft.isActive,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(author ? 'Author profile saved.' : 'Author created.')
      router.push('/admin/authors')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Button asChild variant="outline" size="sm" className="self-start">
        <Link href="/admin/authors"><ArrowLeft data-icon="inline-start" />Back to authors</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Author profile</CardTitle>
          <CardDescription>These fields power the public author page and structured data. Existing author URLs cannot be renamed.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup className="grid gap-6 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="author-name">Display name</FieldLabel>
              <Input id="author-name" value={draft.name} onChange={(event) => handleNameChange(event.target.value)} maxLength={120} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="author-slug">Profile slug</FieldLabel>
              <Input id="author-slug" value={draft.slug} onChange={(event) => { setSlugTouched(true); set('slug', event.target.value) }} readOnly={Boolean(author)} required />
              <FieldDescription>/news/author/{draft.slug || 'author-name'}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="author-role">Role</FieldLabel>
              <Input id="author-role" value={draft.role} onChange={(event) => set('role', event.target.value)} maxLength={160} />
            </Field>
            <Field>
              <FieldLabel htmlFor="author-avatar">Avatar URL</FieldLabel>
              <Input id="author-avatar" type="url" value={draft.avatar} onChange={(event) => set('avatar', event.target.value)} placeholder="https://… or /images/…" />
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="author-avatar-upload">Upload optimized avatar</FieldLabel>
            <Input id="author-avatar-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} disabled={isPending} />
            <FieldDescription>PNG, JPEG or WebP; up to 10 MB.</FieldDescription>
          </Field>
          {draft.avatar ? (
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <Image src={draft.avatar} alt={`Portrait of ${draft.name || 'author'}`} width={80} height={80} className="size-20 rounded-full object-cover" />
              <span className="break-all text-sm text-muted-foreground">{draft.avatar}</span>
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="author-bio">Biography</FieldLabel>
            <Textarea id="author-bio" value={draft.bio} onChange={(event) => set('bio', event.target.value)} rows={6} maxLength={3_000} />
          </Field>
          <FieldGroup className="grid gap-6 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="author-beat">Editorial beats</FieldLabel>
              <Textarea id="author-beat" value={draft.beatText} onChange={(event) => set('beatText', event.target.value)} rows={5} />
              <FieldDescription>One expertise topic per line; used in Person structured data.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="author-same-as">Professional profile links</FieldLabel>
              <Textarea id="author-same-as" value={draft.sameAsText} onChange={(event) => set('sameAsText', event.target.value)} rows={5} placeholder="https://…" />
              <FieldDescription>One HTTP or HTTPS profile URL per line.</FieldDescription>
            </Field>
          </FieldGroup>
          <Field orientation="horizontal" className="rounded-lg border border-border p-4">
            <Checkbox id="author-active" checked={draft.isActive} onCheckedChange={(checked) => set('isActive', checked === true)} />
            <FieldContent>
              <FieldLabel htmlFor="author-active">Active for new articles</FieldLabel>
              <FieldDescription>Deactivating an author does not remove existing published attribution.</FieldDescription>
            </FieldContent>
          </Field>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button asChild variant="outline"><Link href="/admin/authors">Cancel</Link></Button>
        <Button type="submit" disabled={isPending} aria-busy={isPending}>{isPending ? 'Saving…' : author ? 'Save author' : 'Create author'}</Button>
      </div>
    </form>
  )
}
