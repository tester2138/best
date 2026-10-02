'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { saveAdminEditorialContent } from '@/app/actions/admin-editorial'
import type { EditorialContentEntry, EditorialContentKind, EditorialContentStatus } from '@/lib/editorial-content'
import { EditorialHtmlEditor } from '@/components/admin/editorial/html-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type Draft = {
  slug: string
  title: string
  summary: string
  content: string
  status: EditorialContentStatus
  metaTitle: string
  metaDescription: string
  relatedTermsText: string
  sortOrder: string
}

function publicHref(kind: EditorialContentKind, slug: string): string {
  if (kind === 'glossary_term') return `/learn/glossary/${slug}`
  if (kind === 'corrections_policy') return '/corrections'
  if (slug === 'index') return '/learn'
  if (slug === 'glossary') return '/learn/glossary'
  return `/learn/${slug}`
}

function toDraft(entry?: EditorialContentEntry): Draft {
  return {
    slug: entry?.slug ?? '',
    title: entry?.title ?? '',
    summary: entry?.summary ?? '',
    content: entry?.content ?? '',
    status: entry?.status ?? 'draft',
    metaTitle: entry?.metaTitle ?? '',
    metaDescription: entry?.metaDescription ?? '',
    relatedTermsText: (entry?.relatedTerms ?? []).join('\n'),
    sortOrder: String(entry?.sortOrder ?? 0),
  }
}

function parseRelatedTerms(value: string): string[] {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
}

export function EditorialContentForm({
  kind,
  entry,
  readOnly = false,
}: {
  kind: EditorialContentKind
  entry?: EditorialContentEntry
  readOnly?: boolean
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(() => toDraft(entry))
  const [slugTouched, setSlugTouched] = useState(Boolean(entry))
  const [isPending, startTransition] = useTransition()
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleTitleChange(value: string) {
    set('title', value)
    if (!slugTouched) set('slug', value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (readOnly) return
    const sortOrder = Number(draft.sortOrder)
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      toast.error('Sort order must be a non-negative whole number.')
      return
    }

    startTransition(async () => {
      const result = await saveAdminEditorialContent({
        kind,
        originalSlug: entry?.slug ?? null,
        slug: draft.slug,
        title: draft.title,
        summary: draft.summary,
        content: draft.content,
        status: draft.status,
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
        relatedTerms: parseRelatedTerms(draft.relatedTermsText),
        sortOrder,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(entry ? 'Editorial page saved.' : 'Editorial page created.')
      router.push('/admin/learning')
      router.refresh()
    })
  }

  const isPolicy = kind === 'corrections_policy'
  const isStaticIndex = kind === 'learn_page' && ['index', 'glossary'].includes(entry?.slug ?? draft.slug)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Button asChild variant="outline" size="sm" className="self-start"><Link href="/admin/learning"><ArrowLeft data-icon="inline-start" />Back to Learn & glossary</Link></Button>
      <fieldset disabled={readOnly} className="contents">
      <Card>
        <CardHeader>
          <CardTitle>{kind === 'glossary_term' ? 'Glossary entry' : isPolicy ? 'Corrections policy' : 'Learn page'}</CardTitle>
          <CardDescription>Publishing updates the public page at its existing URL. Drafts remain private; coming-soon entries retain their URL without indexing an unfinished definition.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup className="grid gap-6 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="content-title">Title</FieldLabel>
              <Input id="content-title" value={draft.title} onChange={(event) => handleTitleChange(event.target.value)} maxLength={180} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="content-slug">Public slug</FieldLabel>
              <Input id="content-slug" value={draft.slug} onChange={(event) => { setSlugTouched(true); set('slug', event.target.value) }} readOnly={Boolean(entry) || isPolicy} required />
              <FieldDescription>{publicHref(kind, draft.slug || 'page-slug')}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="content-status">Publication status</FieldLabel>
              <Select value={draft.status} onValueChange={(value) => set('status', value as EditorialContentStatus)} disabled={isPolicy}>
                <SelectTrigger id="content-status"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="draft">Draft</SelectItem><SelectItem value="coming_soon">Coming soon</SelectItem><SelectItem value="published">Published</SelectItem></SelectGroup></SelectContent>
              </Select>
              {isPolicy ? <FieldDescription>The corrections policy stays published so readers can always access it.</FieldDescription> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="content-sort-order">Sort order</FieldLabel>
              <Input id="content-sort-order" type="number" min={0} max={100_000} step={1} value={draft.sortOrder} onChange={(event) => set('sortOrder', event.target.value)} />
              <FieldDescription>Lower values appear earlier in lists.</FieldDescription>
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="content-summary">Summary</FieldLabel>
            <Textarea id="content-summary" value={draft.summary} onChange={(event) => set('summary', event.target.value)} maxLength={800} rows={3} />
          </Field>
          <EditorialHtmlEditor value={draft.content} onChange={(value) => set('content', value)} label="Public page content" rows={24} readOnly={readOnly} />
          {kind === 'glossary_term' || isStaticIndex ? (
            <Field>
              <FieldLabel htmlFor="content-related-terms">Related glossary terms</FieldLabel>
              <Textarea id="content-related-terms" value={draft.relatedTermsText} onChange={(event) => set('relatedTermsText', event.target.value)} rows={4} placeholder="spread\nleverage" />
              <FieldDescription>Use existing glossary slugs, one per line.</FieldDescription>
            </Field>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Search metadata</CardTitle>
          <CardDescription>Optional overrides for the page title and search snippet.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-6 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="content-meta-title">SEO title</FieldLabel>
              <Input id="content-meta-title" value={draft.metaTitle} onChange={(event) => set('metaTitle', event.target.value)} maxLength={180} />
            </Field>
            <Field>
              <FieldLabel htmlFor="content-meta-description">SEO description</FieldLabel>
              <Textarea id="content-meta-description" value={draft.metaDescription} onChange={(event) => set('metaDescription', event.target.value)} maxLength={320} rows={3} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      </fieldset>
      {!readOnly ? (
        <div className="flex justify-end gap-3">
          <Button asChild variant="outline"><Link href="/admin/learning">Cancel</Link></Button>
          <Button type="submit" disabled={isPending} aria-busy={isPending}>{isPending ? 'Saving…' : entry ? 'Save page' : 'Create page'}</Button>
        </div>
      ) : null}
    </form>
  )
}
