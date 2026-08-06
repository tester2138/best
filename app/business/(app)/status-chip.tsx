import { cn } from '@/lib/utils'

// Simplified status set used by the dashboard page-status list.
export type SectionStatus = 'live' | 'review' | 'draft'

type Tone = 'neutral' | 'draft' | 'pending' | 'live' | 'danger'

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  live: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
}

// Maps every status string used across sections/offers/media to a tone + label.
const STATUS_MAP: Record<string, { tone: Tone; label: string }> = {
  synced: { tone: 'live', label: 'Published' },
  draft: { tone: 'draft', label: 'Draft' },
  pending_review: { tone: 'pending', label: 'In review' },
  pending: { tone: 'pending', label: 'In review' },
  review: { tone: 'pending', label: 'In review' },
  active: { tone: 'live', label: 'Active' },
  paused: { tone: 'neutral', label: 'Paused' },
  expired: { tone: 'neutral', label: 'Expired' },
  rejected: { tone: 'danger', label: 'Rejected' },
  archived: { tone: 'neutral', label: 'Archived' },
  approved: { tone: 'live', label: 'Approved' },
}

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_MAP[status] ?? { tone: 'neutral' as Tone, label: status }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  )
}
