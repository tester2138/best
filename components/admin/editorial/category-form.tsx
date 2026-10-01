'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { saveAdminCategory } from '@/app/actions/admin-editorial'
import type { AdminCategory } from '@/lib/admin-editorial'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type CategoryDraft = { slug: string; name: string; description: string }

export function CategoryForm({ category }: { category?: AdminCategory }) {
  const router = useRouter()
  const [draft, setDraft] = useState<CategoryDraft>(() => ({
    slug: category?.slug ?? '',
    name: category?.name ?? '',
    description: category?.description ?? '',
  }))
  const [slugTouched, setSlugTouched] = useState(Boolean(category))
  const [isPending, startTransition] = useTransition()
  const set = <Key extends keyof CategoryDraft>(key: Key, value: CategoryDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleNameChange(value: string) {
    set('name', value)
    if (!slugTouched) set('slug', value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await saveAdminCategory({
        originalSlug: category?.slug ?? null,
        slug: draft.slug,
        name: draft.name,
        description: draft.description,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(category ? 'Category saved.' : 'Category created.')
      router.push('/admin/categories')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Button asChild variant="outline" size="sm" className="self-start"><Link href="/admin/categories"><ArrowLeft data-icon="inline-start" />Back to categories</Link></Button>
      <Card>
        <CardHeader>
          <CardTitle>Category details</CardTitle>
          <CardDescription>Category names are used on article cards and public news archives. Slugs are kept stable to preserve existing URLs.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-6 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="category-name">Name</FieldLabel>
              <Input id="category-name" value={draft.name} onChange={(event) => handleNameChange(event.target.value)} maxLength={100} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="category-slug">URL slug</FieldLabel>
              <Input id="category-slug" value={draft.slug} onChange={(event) => { setSlugTouched(true); set('slug', event.target.value) }} readOnly={Boolean(category)} required />
              <FieldDescription>/news/category/{draft.slug || 'category-name'}</FieldDescription>
            </Field>
            <Field className="lg:col-span-2">
              <FieldLabel htmlFor="category-description">Description</FieldLabel>
              <Textarea id="category-description" value={draft.description} onChange={(event) => set('description', event.target.value)} maxLength={500} rows={4} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button asChild variant="outline"><Link href="/admin/categories">Cancel</Link></Button>
        <Button type="submit" disabled={isPending} aria-busy={isPending}>{isPending ? 'Saving…' : category ? 'Save category' : 'Create category'}</Button>
      </div>
    </form>
  )
}
