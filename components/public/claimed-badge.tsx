import { BadgeCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'

/**
 * Rendered in the hero meta row of a claimed broker page (Blueprint Section
 * 15.4). Signals that the profile content is maintained by the brand itself.
 * Only shown when the brand is claimed AND portal access is active.
 */
export function ClaimedBadge({
  brandName,
  lastPublishedAt,
}: {
  brandName: string
  lastPublishedAt: string | null
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Profile managed by {brandName}</span>
      {lastPublishedAt && (
        <span className="text-muted-foreground">
          {' · '}Updated {formatDate(new Date(lastPublishedAt))}
        </span>
      )}
    </div>
  )
}
