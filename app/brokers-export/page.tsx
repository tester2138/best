import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function getBrokerStats() {
  const csv = readFileSync(join(process.cwd(), 'public', 'bestforex-brokers.csv'), 'utf8')
  const lines = csv.trim().split('\n')
  return { total: lines.length - 1 } // minus header
}

export const metadata = {
  title: 'Brokers Export',
  robots: 'noindex,nofollow',
}

export default function BrokersExportPage() {
  const { total } = getBrokerStats()

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">BestForex.io</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">Brokers List Export</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Complete directory of <span className="font-semibold text-foreground">{total.toLocaleString()} brokers</span>,
          sorted by rank as displayed on the{' '}
          <span className="font-medium">/brokers</span> page.
        </p>

        <a
          href="/api/brokers-csv"
          download="bestforex-brokers.csv"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Download CSV
        </a>

        <div className="mt-8 text-left rounded-lg bg-muted/40 border border-border px-4 py-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground mb-2">Columns included</p>
          {[
            'rank — position on /brokers (1 to ' + total + ')',
            'name — display name',
            'slug — URL slug (/brokers/{slug})',
            'legalName',
            'headquarters / country',
            'regulators — pipe-separated',
            'dataQualityStage — reviewed / enriched / basic',
            'verificationStatus — sponsored / verified / unverified',
            'rating, minDeposit, spreadsFrom',
            'platforms — pipe-separated',
            'websiteUrl',
          ].map((col) => (
            <p key={col} className="font-mono">{col}</p>
          ))}
        </div>
      </div>
    </main>
  )
}
