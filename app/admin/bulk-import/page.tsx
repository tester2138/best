'use client'

import { useRef, useState, useCallback } from 'react'
import {
  Upload, FileJson, CheckCircle2, XCircle, SkipForward,
  Download, ChevronDown, ChevronUp, RefreshCw, FileCode2, Files,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ImportRowResult } from '@/app/api/admin/bulk-import/route'

// ── JS → section mapper ───────────────────────────────────────────────────────
interface JsBroker {
  brokerId?: string
  name?: string
  shortDescription?: string
  longDescription?: string
  seo?: { metaTitle?: string; metaDescription?: string }
  regulators?: Array<{ authority?: string; country?: string; licenseNumber?: string | null; sourceUrl?: string }>
  pros?: string[]
  cons?: string[]
  faq?: Array<{ question?: string; answer?: string }>
  quickFacts?: {
    minDeposit?: string
    spreadsFrom?: string
    maxLeverage?: string
    headquarters?: string
    founded?: string
    platforms?: string[]
  }
  operatingStatus?: string
}

function mapJsBrokerToSections(b: JsBroker): Record<string, unknown> {
  const sections: Record<string, unknown> = {}

  const hero: Record<string, unknown> = {}
  if (b.shortDescription) hero.short_description = b.shortDescription
  if (b.quickFacts?.founded) hero.founded_year = parseInt(b.quickFacts.founded, 10) || undefined
  if (b.quickFacts?.headquarters) {
    const parts = b.quickFacts.headquarters.split(',')
    hero.hq_city = parts[0]?.trim()
    hero.hq_country = parts[parts.length - 1]?.trim()
  }
  if (Object.keys(hero).length > 0) sections.hero = hero

  const key_facts: Record<string, unknown> = {}
  if (b.quickFacts?.platforms) key_facts.platforms = b.quickFacts.platforms
  if (b.quickFacts?.maxLeverage) key_facts.max_leverage = b.quickFacts.maxLeverage
  if (b.quickFacts?.spreadsFrom) key_facts.spreads_from = b.quickFacts.spreadsFrom
  if (b.quickFacts?.minDeposit) {
    // Extract the FIRST number only — strings like "£100 / $150 / €150" must not
    // have all digits concatenated. Match an optional currency symbol then digits.
    const firstMatch = b.quickFacts.minDeposit.match(/([£$€]?)\s*(\d+(?:[.,]\d+)?)/)
    if (firstMatch) {
      const amt = parseFloat(firstMatch[2].replace(',', '.'))
      if (!isNaN(amt)) {
        key_facts.min_deposit_amount = amt
        const sym = firstMatch[1] || (b.quickFacts.minDeposit.includes('£') ? '£' : b.quickFacts.minDeposit.includes('€') ? '€' : '$')
        key_facts.min_deposit_currency = sym === '£' ? 'GBP' : sym === '€' ? 'EUR' : 'USD'
      }
    }
  }
  if (Object.keys(key_facts).length > 0) sections.key_facts = key_facts

  if (b.longDescription) {
    const paragraphs = b.longDescription.split('\n\n').map((p) => `<p>${p.trim()}</p>`).join('\n')
    sections.about = { body: paragraphs }
  }

  if (b.pros?.length || b.cons?.length) {
    sections.pros_cons = { pros: b.pros ?? [], cons: b.cons ?? [] }
  }

  if (b.regulators && b.regulators.length > 0) {
    const regs = b.regulators.map((r) => {
      const label = r.authority && r.country ? `${r.authority} (${r.country})` : (r.authority ?? r.country ?? 'Unknown')
      return r.licenseNumber ? `${label} — ${r.licenseNumber}` : label
    })
    sections.regulation = { regulators: regs }
  }

  if (b.faq && b.faq.length > 0) {
    sections.faq = {
      items: b.faq.map((f) => ({ q: f.question ?? '', a: f.answer ?? '' })),
    }
  }

  return sections
}

function parseJsFile(text: string): JsBroker | null {
  // Greedy match to grab the full broker object even when `export const offers` follows
  const match = text.match(/export\s+const\s+broker\s*=\s*(\{[\s\S]*\});/)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as JsBroker
  } catch {
    // Some files may have trailing commas — strip them and retry
    try {
      const cleaned = match[1].replace(/,\s*([}\]])/g, '$1')
      return JSON.parse(cleaned) as JsBroker
    } catch {
      return null
    }
  }
}

// ── Template ──────────────────────────────────────────────────────────────────
const TEMPLATE = JSON.stringify(
  [
    {
      slug: 'example-broker',
      hero: { short_description: 'A leading regulated forex broker.', founded_year: 2010, hq_country: 'United Kingdom', hq_city: 'London' },
      key_facts: { min_deposit_amount: 100, min_deposit_currency: 'USD', max_leverage: '1:30', spreads_from: '0.6 pips', platforms: ['MetaTrader 4', 'MetaTrader 5'] },
      about: { body: '<p>Founded in 2010, Example Broker serves traders in 100+ countries.</p>' },
      pros_cons: { pros: ['Tier-1 regulated', 'Low spreads'], cons: ['No US clients'] },
      regulation: { regulators: ['FCA (United Kingdom)', 'ASIC (Australia)'], client_money: 'Segregated in tier-1 banks.' },
      faq: { items: [{ q: 'Is it regulated?', a: 'Yes, by the FCA and ASIC.' }] },
    },
  ],
  null,
  2,
)

// ── Status helpers ────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: ImportRowResult['status'] }) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />
  return <SkipForward className="h-4 w-4 text-muted-foreground" />
}

function statusBadge(status: ImportRowResult['status']) {
  if (status === 'ok') return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">ok</Badge>
  if (status === 'error') return <Badge variant="destructive">error</Badge>
  return <Badge variant="secondary">skipped</Badge>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BulkImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // Multi-file state
  const [fileCount, setFileCount] = useState(0)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [jsonPayload, setJsonPayload] = useState<unknown[] | null>(null)
  const [previewSlugs, setPreviewSlugs] = useState<string[]>([])

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [summary, setSummary] = useState<{ ok: number; skipped: number; errors: number } | null>(null)
  const [results, setResults] = useState<ImportRowResult[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'ok' | 'skipped' | 'error'>('all')

  // ── Read a single File as text ─────────────────────────────────────────────
  const readText = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = (e) => res(e.target?.result as string)
      r.onerror = () => rej(new Error(`Failed to read ${f.name}`))
      r.readAsText(f)
    })

  // ── Process a FileList / File[] into a merged payload ─────────────────────
  const processFiles = useCallback(async (files: File[]) => {
    setParseErrors([])
    setJsonPayload(null)
    setSummary(null)
    setResults([])
    setProgress(0)
    setFileCount(files.length)

    const merged: unknown[] = []
    const errors: string[] = []

    for (const f of files) {
      const isJs = f.name.endsWith('.js')
      try {
        const text = await readText(f)
        if (isJs) {
          const broker = parseJsFile(text)
          if (!broker) {
            errors.push(`${f.name}: could not parse broker object`)
            continue
          }
          const slug = broker.brokerId ?? f.name.replace(/\.js$/, '')
          const sections = mapJsBrokerToSections(broker)
          if (Object.keys(sections).length === 0) {
            errors.push(`${f.name}: no mappable sections found`)
            continue
          }
          merged.push({ slug, ...sections })
        } else {
          // .json — must be an array
          const parsed = JSON.parse(text)
          if (!Array.isArray(parsed)) {
            errors.push(`${f.name}: must contain a JSON array`)
            continue
          }
          merged.push(...parsed)
        }
      } catch (err) {
        errors.push(`${f.name}: ${err instanceof Error ? err.message : 'unknown error'}`)
      }
    }

    if (errors.length > 0) setParseErrors(errors)
    if (merged.length > 0) {
      setJsonPayload(merged)
      setPreviewSlugs(
        merged
          .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && 'slug' in r)
          .map((r) => r.slug as string)
          .slice(0, 5),
      )
    }
  }, [])

  // ── Drop handler — accepts any number of files ─────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.endsWith('.js') || f.name.endsWith('.json'),
      )
      if (files.length > 0) processFiles(files)
    },
    [processFiles],
  )

  const [apiError, setApiError] = useState<string | null>(null)

  // ── Import ─────────────────────────────────────────────────────────────────
  const runImport = async () => {
    if (!jsonPayload) return
    setRunning(true)
    setProgress(0)
    setSummary(null)
    setResults([])
    setApiError(null)

    const CHUNK = 50
    const total = jsonPayload.length
    const allResults: ImportRowResult[] = []

    for (let i = 0; i < total; i += CHUNK) {
      const chunk = jsonPayload.slice(i, i + CHUNK)
      setProgressLabel(`Processing ${i + 1}–${Math.min(i + CHUNK, total)} of ${total}…`)
      let res: Response
      try {
        res = await fetch('/api/admin/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
          credentials: 'include',
        })
      } catch (e) {
        setApiError(`Network error: ${e instanceof Error ? e.message : String(e)}`)
        setRunning(false)
        return
      }

      if (!res.ok) {
        let msg = `Server error ${res.status}`
        try { const d = await res.json(); msg = d.error ?? msg } catch { /* ignore */ }
        setApiError(msg)
        setRunning(false)
        return
      }

      const data = await res.json()
      if (data.results) allResults.push(...(data.results as ImportRowResult[]))
      setProgress(Math.min(100, Math.round(((i + CHUNK) / total) * 100)))
      setResults([...allResults])
    }

    const ok = allResults.filter((r) => r.status === 'ok').length
    const skipped = allResults.filter((r) => r.status === 'skipped').length
    const errors = allResults.filter((r) => r.status === 'error').length
    setSummary({ ok, skipped, errors })
    setProgressLabel('')
    setProgress(100)
    setRunning(false)
  }

  const toggleExpand = (slug: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'bulk-import-template.json'
    a.click()
  }

  const reset = () => {
    setFileCount(0)
    setParseErrors([])
    setJsonPayload(null)
    setPreviewSlugs([])
    setSummary(null)
    setResults([])
    setProgress(0)
    setProgressLabel('')
    setApiError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const filteredResults = results.filter((r) => filter === 'all' || r.status === filter)
  const entryCount = jsonPayload?.length ?? 0

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bulk Import</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag and drop up to 877 <code className="text-xs bg-muted px-1 py-0.5 rounded">.js</code> broker
            files at once, or a single <code className="text-xs bg-muted px-1 py-0.5 rounded">.json</code> array.
            JS files are auto-parsed and mapped to sections — no conversion needed.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="shrink-0">
          <Download className="h-4 w-4 mr-2" />
          Download template
        </Button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
        )}
      >
        {/* multiple + webkitdirectory removed intentionally — directory pick on macOS shows Finder
            which only works via file picker, but multi-file drag-drop from Finder works natively */}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".json,.js,application/json,text/javascript,application/javascript"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length > 0) processFiles(files)
          }}
        />
        {fileCount > 0
          ? fileCount > 1
            ? <Files className={cn('h-12 w-12', dragging ? 'text-primary' : 'text-primary')} />
            : <FileCode2 className="h-12 w-12 text-primary" />
          : <FileJson className={cn('h-12 w-12', dragging ? 'text-primary' : 'text-muted-foreground')} />
        }
        <div className="text-center">
          <p className="font-medium">
            {fileCount > 0
              ? `${fileCount.toLocaleString()} file${fileCount !== 1 ? 's' : ''} selected`
              : 'Drop all your .js files here, or click to browse'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Select all 877 files at once — each .js file is one broker (auto-mapped)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Or drop a single .json array (up to 2,000 entries)
          </p>
        </div>
      </div>

      {/* API / auth error */}
      {apiError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-2">
          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Import failed</p>
            <p className="text-xs text-destructive/80 mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex flex-col gap-1.5">
          <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
            <XCircle className="h-4 w-4" />
            {parseErrors.length} file{parseErrors.length !== 1 ? 's' : ''} could not be parsed
          </p>
          <ul className="text-xs text-destructive/80 list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
            {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Preview */}
      {jsonPayload && entryCount > 0 && (
        <div className="rounded-lg border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {entryCount.toLocaleString()} {entryCount === 1 ? 'entry' : 'entries'} ready to import
              <Badge variant="secondary" className="ml-2 text-xs">JS auto-mapped</Badge>
            </p>
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            First slugs: {previewSlugs.join(', ')}
            {entryCount > 5 ? ` … +${entryCount - 5} more` : ''}
          </p>
          <Button onClick={runImport} disabled={running} className="self-start" size="lg">
            <Upload className="h-4 w-4 mr-2" />
            {running ? 'Importing…' : summary ? `Re-import ${entryCount.toLocaleString()} entries` : `Start import — ${entryCount.toLocaleString()} ${entryCount === 1 ? 'entry' : 'entries'}`}
          </Button>
        </div>
      )}

      {/* Progress */}
      {running && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{progressLabel || 'Processing…'}</span>
            <span className="tabular-nums font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-green-500/5 border-green-500/20 p-4 flex flex-col gap-1">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="text-2xl font-semibold tabular-nums mt-1">{summary.ok.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Imported</p>
          </div>
          <div className="rounded-lg border bg-muted p-4 flex flex-col gap-1">
            <SkipForward className="h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-semibold tabular-nums mt-1">{summary.skipped.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Skipped</p>
          </div>
          <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-4 flex flex-col gap-1">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-2xl font-semibold tabular-nums mt-1">{summary.errors.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Errors</p>
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Results</p>
            <div className="flex gap-1.5 ml-auto flex-wrap">
              {(['all', 'ok', 'skipped', 'error'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  {f === 'all' ? `All (${results.length.toLocaleString()})`
                    : f === 'ok' ? `OK (${results.filter(r => r.status === 'ok').length.toLocaleString()})`
                    : f === 'skipped' ? `Skipped (${results.filter(r => r.status === 'skipped').length.toLocaleString()})`
                    : `Errors (${results.filter(r => r.status === 'error').length.toLocaleString()})`}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden max-h-[520px] overflow-y-auto">
            <div className="divide-y">
              {filteredResults.map((row) => (
                <div key={row.slug} className="bg-card">
                  <button
                    onClick={() => toggleExpand(row.slug)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <StatusIcon status={row.status} />
                    <span className="font-mono text-sm flex-1 truncate">{row.slug}</span>
                    {statusBadge(row.status)}
                    {row.status === 'ok' && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {row.sectionsWritten} section{row.sectionsWritten !== 1 ? 's' : ''}
                      </span>
                    )}
                    {expanded.has(row.slug)
                      ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" />
                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" />}
                  </button>

                  {expanded.has(row.slug) && (
                    <div className="px-4 pb-3 pt-0 text-xs text-muted-foreground flex flex-col gap-1 border-t bg-muted/20">
                      {row.message && (
                        <p><span className="font-medium text-foreground">Message:</span> {row.message}</p>
                      )}
                      {row.unknownSections.length > 0 && (
                        <p><span className="font-medium text-foreground">Unknown keys ignored:</span> {row.unknownSections.join(', ')}</p>
                      )}
                      {row.status === 'ok' && (
                        <p><span className="font-medium text-foreground">Sections written:</span> {row.sectionsWritten}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {summary && (
            <Button variant="outline" size="sm" className="self-start" onClick={reset}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Import another batch
            </Button>
          )}
        </div>
      )}

      {/* Section reference */}
      <details className="group rounded-lg border overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium hover:bg-muted/40">
          Supported section keys (JSON mode)
          <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
        </summary>
        <div className="px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {['hero','key_facts','about','pros_cons','trading_conditions','platforms','deposits_withdrawals','regulation','support','faq','company','cta'].map((k) => (
            <code key={k} className="text-xs bg-muted px-2 py-1 rounded">{k}</code>
          ))}
        </div>
      </details>

      <details className="group rounded-lg border overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium hover:bg-muted/40">
          JS file auto-mapping reference
          <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
        </summary>
        <div className="px-4 pb-4 pt-2 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">JS field</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Maps to section key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['brokerId', 'slug'],
                ['shortDescription', 'hero.short_description'],
                ['quickFacts.founded', 'hero.founded_year'],
                ['quickFacts.headquarters', 'hero.hq_city / hq_country'],
                ['quickFacts.minDeposit', 'key_facts.min_deposit_amount / currency'],
                ['quickFacts.maxLeverage', 'key_facts.max_leverage'],
                ['quickFacts.spreadsFrom', 'key_facts.spreads_from'],
                ['quickFacts.platforms', 'key_facts.platforms'],
                ['longDescription', 'about.body'],
                ['pros', 'pros_cons.pros'],
                ['cons', 'pros_cons.cons'],
                ['regulators[]', 'regulation.regulators[]'],
                ['faq[]', 'faq.items[]'],
              ].map(([js, section]) => (
                <tr key={js}>
                  <td className="py-2 pr-4 font-mono text-foreground">{js}</td>
                  <td className="py-2 font-mono text-muted-foreground">{section}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
