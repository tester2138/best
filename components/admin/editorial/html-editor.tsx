'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

export function EditorialHtmlEditor({
  value,
  onChange,
  label = 'Body content',
  rows = 24,
  readOnly = false,
}: {
  value: string
  onChange: (value: string) => void
  label?: string
  rows?: number
  readOnly?: boolean
}) {
  const previewDocument = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,sans-serif;line-height:1.65;margin:24px;color:#17202a}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:8px}blockquote{border-left:3px solid #64748b;margin-left:0;padding-left:16px}</style></head><body>${value}</body></html>`
  const preview = value.trim() ? (
    <iframe
      title={`${label} preview`}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={previewDocument}
      className="h-[32rem] w-full rounded-md border border-border bg-background"
    />
  ) : (
    <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
      Add body content to see a preview.
    </div>
  )

  return (
    <section className="flex flex-col gap-3" aria-label={label}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">{label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">HTML source is sanitized on save. Preview runs in an isolated frame.</p>
        </div>
      </div>
      {readOnly ? (
        <div className="mt-3">{preview}</div>
      ) : (
        <Tabs defaultValue="source" className="w-full">
          <TabsList>
            <TabsTrigger value="source">HTML source</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="source" className="mt-3">
            <Textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={rows}
              spellCheck={false}
              aria-label={`${label} HTML`}
              className="min-h-72 font-mono text-xs leading-6"
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-3">{preview}</TabsContent>
        </Tabs>
      )}
    </section>
  )
}
