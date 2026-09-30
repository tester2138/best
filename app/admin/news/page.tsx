import Link from 'next/link'
import { query } from '@/lib/portal/db'
import { requireStaff } from '@/lib/guards'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'News · BestForex Portal', robots: { index: false, follow: false } }

interface NewsRow { id: string; slug: string; title: string; category: string; status: string | null; author_name: string; published_at: string | null; is_featured: boolean | null }

export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireStaff('editorial:read')
  const params = await searchParams
  const term = (params.q ?? '').trim().slice(0, 100)
  const status = ['draft', 'published', 'scheduled'].includes(params.status ?? '') ? params.status : ''
  const rows = await query<NewsRow>(
    `select id, slug, title, category, status, author_name, published_at, is_featured
       from public.posts
      where ($1::text = '' or title ilike '%' || $1 || '%' or slug ilike '%' || $1 || '%' or author_name ilike '%' || $1 || '%')
        and ($2::text = '' or status = $2)
      order by published_at desc nulls last, created_at desc
      limit 150`, [term, status],
  )
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">News</h1><p className="mt-1 text-sm text-muted-foreground">Editorial records from the live publishing database</p></div>
      <form action="/admin/news" className="flex flex-col gap-3 sm:flex-row"><Input name="q" defaultValue={term} placeholder="Search title, slug or author" aria-label="Search news"/><select name="status" defaultValue={status} className="h-10 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by status"><option value="">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option></select><Button type="submit" variant="secondary">Filter</Button></form>
      {rows.length === 0 ? <Card className="p-8 text-sm text-muted-foreground">No articles match these filters.</Card> : <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-muted/50"><tr><th className="p-3 font-medium">Article</th><th className="p-3 font-medium">Author</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Published</th><th className="p-3 font-medium">Open</th></tr></thead><tbody>{rows.map((post) => <tr key={post.id} className="border-t border-border"><td className="p-3"><p className="max-w-xl font-medium">{post.title}</p><p className="mt-1 text-xs text-muted-foreground">/{post.slug} · {post.category}{post.is_featured ? ' · Featured' : ''}</p></td><td className="p-3">{post.author_name}</td><td className="p-3"><Badge variant={post.status === 'published' ? 'secondary' : 'outline'}>{post.status ?? 'unknown'}</Badge></td><td className="p-3 text-muted-foreground">{post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}</td><td className="p-3"><Link className="text-primary hover:underline" href={`/news/${post.slug}`} target="_blank" rel="noreferrer">Preview</Link></td></tr>)}</tbody></table></div>}
    </div>
  )
}
