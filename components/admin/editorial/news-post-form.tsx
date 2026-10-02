'use client'

import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { saveAdminNewsPost } from '@/app/actions/admin-editorial'
import { uploadEditorialImage } from '@/components/admin/editorial/upload-editorial-image'
import type { AdminCategory, AdminEditorialAuthor, AdminNewsPost } from '@/lib/admin-editorial'
import { EditorialHtmlEditor } from '@/components/admin/editorial/html-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type Draft = {
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  editorialType: 'News' | 'Analysis' | 'Opinion'
  authorSlug: string
  publishedAt: string
  status: 'draft' | 'published'
  featuredImage: string
  imageAltText: string
  isFeatured: boolean
  metaTitle: string
  metaDescription: string
  sourceName: string
  sourceUrl: string
  tagsText: string
  relatedBrokersText: string
  linkedSourcesText: string
  editorNote: string
}

function toLocalDateTime(value?: string): string {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function linesToArray(value: string): string[] {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
}

function sourceLinesToArray(value: string): { label: string; url: string }[] {
  return value.split(/\r?\n/).map((line) => {
    const divider = line.indexOf('|')
    if (divider < 0) return null
    return { label: line.slice(0, divider).trim(), url: line.slice(divider + 1).trim() }
  }).filter((source): source is { label: string; url: string } => Boolean(source?.label && source.url))
}

function sourceArrayToLines(sources?: { label: string; url: string }[]): string {
  return (sources ?? []).map((source) => `${source.label} | ${source.url}`).join('\n')
}

function toDraft(post?: AdminNewsPost): Draft {
  const editorialType = post?.editorialType ?? (post?.category === 'analysis' ? 'Analysis' : post?.category === 'opinion' ? 'Opinion' : 'News')
  return {
    slug: post?.slug ?? '',
    title: post?.title ?? '',
    excerpt: post?.excerpt ?? '',
    content: post?.content ?? '',
    category: post?.category ?? '',
    editorialType,
    authorSlug: post?.author.slug ?? '',
    publishedAt: toLocalDateTime(post?.publishedAt),
    status: post?.status === 'draft' ? 'draft' : 'published',
    featuredImage: post?.featuredImage ?? '',
    imageAltText: post?.imageAltText ?? '',
    isFeatured: post?.isFeatured ?? false,
    metaTitle: post?.metaTitle ?? '',
    metaDescription: post?.metaDescription ?? '',
    sourceName: post?.sourceName ?? '',
    sourceUrl: post?.sourceUrl ?? '',
    tagsText: (post?.tags ?? []).join('\n'),
    relatedBrokersText: (post?.relatedBrokers ?? []).join('\n'),
    linkedSourcesText: sourceArrayToLines(post?.linkedSources),
    editorNote: post?.editorNote ?? '',
  }
}

export function NewsPostForm({
  post,
  categories,
  authors,
}: {
  post?: AdminNewsPost
  categories: AdminCategory[]
  authors: AdminEditorialAuthor[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState(() => toDraft(post))
  const [slugTouched, setSlugTouched] = useState(Boolean(post))
  const originalSlug = post?.slug ?? null
  const editableAuthors = authors
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleTitleChange(value: string) {
    set('title', value)
    if (!slugTouched) {
      set('slug', value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalidSourceLine = draft.linkedSourcesText
      .split(/\r?\n/)
      .find((line) => line.trim() && (!line.includes('|') || !line.slice(0, line.indexOf('|')).trim() || !line.slice(line.indexOf('|') + 1).trim()))
    if (invalidSourceLine) {
      toast.error('Each additional source needs a label and URL separated by a vertical bar.')
      return
    }
    const publishDate = new Date(draft.publishedAt)
    if (Number.isNaN(publishDate.getTime())) {
      toast.error('Choose a valid publication date and time.')
      return
    }

    startTransition(async () => {
      const result = await saveAdminNewsPost({
        originalSlug,
        slug: draft.slug,
        title: draft.title,
        excerpt: draft.excerpt,
        content: draft.content,
        category: draft.category,
        editorialType: draft.editorialType,
        authorSlug: draft.authorSlug,
        publishedAt: publishDate.toISOString(),
        status: draft.status,
        featuredImage: draft.featuredImage,
        imageAltText: draft.imageAltText,
        isFeatured: draft.isFeatured,
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
        sourceName: draft.sourceName,
        sourceUrl: draft.sourceUrl,
        tags: linesToArray(draft.tagsText),
        relatedBrokers: linesToArray(draft.relatedBrokersText),
        linkedSources: sourceLinesToArray(draft.linkedSourcesText),
        editorNote: draft.editorNote,
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(post ? 'Article changes saved.' : 'Article created.')
      router.push('/admin/news')
      router.refresh()
    })
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    startTransition(async () => {
      const result = await uploadEditorialImage(file)
      if (!result.ok || !result.data) {
        toast.error(result.ok ? 'The image upload did not return a URL.' : result.error)
        input.value = ''
        return
      }
      const imageUrl = result.data.url
      setDraft((current) => ({ ...current, featuredImage: imageUrl }))
      toast.success('Image uploaded. The optimized URL is attached to this article.')
      input.value = ''
    })
  }

  const statusDescription = 'Future publication dates are automatically scheduled and remain hidden until their release time.'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/news"><ArrowLeft data-icon="inline-start" />Back to articles</Link>
        </Button>
        {post ? <Badge variant={post.status === 'published' ? 'secondary' : 'outline'}>{post.status}</Badge> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Story</CardTitle>
          <CardDescription>Keep the existing article URL stable; published copy is sanitized before it reaches the public site.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup className="grid gap-6 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="article-title">Headline</FieldLabel>
              <Input id="article-title" value={draft.title} onChange={(event) => handleTitleChange(event.target.value)} maxLength={180} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="article-slug">URL slug</FieldLabel>
              <Input
                id="article-slug"
                value={draft.slug}
                onChange={(event) => { setSlugTouched(true); set('slug', event.target.value) }}
                readOnly={Boolean(post)}
                aria-describedby="article-slug-help"
                required
              />
              <FieldDescription id="article-slug-help">/news/{draft.slug || 'your-article-url'}</FieldDescription>
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="article-excerpt">Excerpt</FieldLabel>
            <Textarea id="article-excerpt" value={draft.excerpt} onChange={(event) => set('excerpt', event.target.value)} maxLength={500} rows={3} required />
            <FieldDescription>A short summary used in cards, metadata fallbacks and feeds.</FieldDescription>
          </Field>
          <EditorialHtmlEditor value={draft.content} onChange={(value) => set('content', value)} label="Article body" rows={28} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publishing</CardTitle>
          <CardDescription>Editorial labels, author attribution, timing and featured placement are managed independently of commercial sponsorship.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select value={draft.category} onValueChange={(value) => set('category', value)}>
                <SelectTrigger aria-label="Category"><SelectValue placeholder="Choose category" /></SelectTrigger>
                <SelectContent><SelectGroup>{categories.map((category) => <SelectItem key={category.slug} value={category.slug}>{category.name}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Author</FieldLabel>
              <Select value={draft.authorSlug} onValueChange={(value) => set('authorSlug', value)}>
                <SelectTrigger aria-label="Author"><SelectValue placeholder="Choose author" /></SelectTrigger>
                <SelectContent><SelectGroup>{editableAuthors.map((author) => <SelectItem key={author.slug} value={author.slug}>{author.name}{author.isActive ? '' : ' (inactive)'}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Editorial type</FieldLabel>
              <Select value={draft.editorialType} onValueChange={(value) => set('editorialType', value as Draft['editorialType'])}>
                <SelectTrigger aria-label="Editorial type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="News">News</SelectItem><SelectItem value="Analysis">Analysis</SelectItem><SelectItem value="Opinion">Opinion</SelectItem></SelectGroup></SelectContent>
              </Select>
              <FieldDescription>Paid placements never change this editorial classification.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="article-status">Status</FieldLabel>
              <Select value={draft.status} onValueChange={(value) => set('status', value as Draft['status'])}>
                <SelectTrigger id="article-status"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Publish / schedule</SelectItem></SelectGroup></SelectContent>
              </Select>
              <FieldDescription>{statusDescription}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="article-published-at">Publish date and time</FieldLabel>
              <Input id="article-published-at" type="datetime-local" value={draft.publishedAt} onChange={(event) => set('publishedAt', event.target.value)} required />
              <FieldDescription>Times are interpreted in your browser’s local timezone, then stored as UTC.</FieldDescription>
            </Field>
            <FieldSet className="gap-3 rounded-lg border border-border p-4">
              <FieldLegend variant="label">Homepage placement</FieldLegend>
              <FieldGroup className="gap-3">
                <Field orientation="horizontal">
                  <Checkbox id="article-featured" checked={draft.isFeatured} onCheckedChange={(checked) => set('isFeatured', checked === true)} />
                  <FieldContent>
                    <FieldLabel htmlFor="article-featured">Feature this article</FieldLabel>
                    <FieldDescription>This is editorial prominence, not paid sponsorship.</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image and search metadata</CardTitle>
          <CardDescription>Images are validated, resized and stored as WebP before the URL is saved to the article.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup className="grid gap-6 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="article-image">Featured image URL</FieldLabel>
              <Input id="article-image" type="url" inputMode="url" value={draft.featuredImage} onChange={(event) => set('featuredImage', event.target.value)} placeholder="https://… or /images/…" />
            </Field>
            <Field>
              <FieldLabel htmlFor="article-image-alt">Image alt text</FieldLabel>
              <Input id="article-image-alt" value={draft.imageAltText} onChange={(event) => set('imageAltText', event.target.value)} maxLength={300} />
              <FieldDescription>Defaults to the article headline if left blank.</FieldDescription>
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="article-image-upload">Upload and optimize an image</FieldLabel>
            <Input id="article-image-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} disabled={isPending} />
            <FieldDescription>PNG, JPEG or WebP; up to 10 MB. Upload begins as soon as a file is selected.</FieldDescription>
          </Field>
          {draft.featuredImage ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <Image src={draft.featuredImage} alt={draft.imageAltText || draft.title || 'Featured image preview'} width={960} height={540} className="max-h-72 w-full object-contain" />
            </div>
          ) : null}
          <FieldGroup className="grid gap-6 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="article-meta-title">SEO title</FieldLabel>
              <Input id="article-meta-title" value={draft.metaTitle} onChange={(event) => set('metaTitle', event.target.value)} maxLength={180} />
            </Field>
            <Field>
              <FieldLabel htmlFor="article-meta-description">SEO description</FieldLabel>
              <Textarea id="article-meta-description" value={draft.metaDescription} onChange={(event) => set('metaDescription', event.target.value)} maxLength={320} rows={3} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sources and context</CardTitle>
          <CardDescription>Keep factual citations attached to the story. Each additional source is entered as one “label | URL” line.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup className="grid gap-6 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="article-source-name">Primary source name</FieldLabel>
              <Input id="article-source-name" value={draft.sourceName} onChange={(event) => set('sourceName', event.target.value)} maxLength={240} />
            </Field>
            <Field>
              <FieldLabel htmlFor="article-source-url">Primary source URL</FieldLabel>
              <Input id="article-source-url" type="url" value={draft.sourceUrl} onChange={(event) => set('sourceUrl', event.target.value)} />
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="article-linked-sources">Additional sources</FieldLabel>
            <Textarea id="article-linked-sources" value={draft.linkedSourcesText} onChange={(event) => set('linkedSourcesText', event.target.value)} rows={6} placeholder={'Regulator notice | https://…\nCompany response | https://…'} />
          </Field>
          <FieldGroup className="grid gap-6 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="article-tags">Tags</FieldLabel>
              <Textarea id="article-tags" value={draft.tagsText} onChange={(event) => set('tagsText', event.target.value)} rows={4} />
              <FieldDescription>One tag per line or comma-separated.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="article-brokers">Related broker slugs</FieldLabel>
              <Textarea id="article-brokers" value={draft.relatedBrokersText} onChange={(event) => set('relatedBrokersText', event.target.value)} rows={4} />
              <FieldDescription>Use the existing public profile slug for each linked broker.</FieldDescription>
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="article-editor-note">Editor note or correction</FieldLabel>
            <Textarea id="article-editor-note" value={draft.editorNote} onChange={(event) => set('editorNote', event.target.value)} maxLength={4_000} rows={4} />
            <FieldDescription>Plain text shown as an editor’s note on the public article.</FieldDescription>
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild variant="outline"><Link href="/admin/news">Cancel</Link></Button>
        <Button type="submit" disabled={isPending || !categories.length || !editableAuthors.length} aria-busy={isPending}>
          {isPending ? 'Saving…' : post ? 'Save article' : 'Create article'}
        </Button>
      </div>
    </form>
  )
}
