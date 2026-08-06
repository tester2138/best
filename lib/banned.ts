/**
 * Banned-term scanner (Blueprint Section 9.4).
 * Scans every string value in a section payload. Flags never block a save;
 * they force the publish into the moderation queue (Section 16.1).
 */

export interface Flag {
  type: 'banned_term' | 'url'
  detail: string
}

export function scanBanned(payload: unknown, terms: string[]): Flag[] {
  const found = new Set<string>()
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      const low = v.toLowerCase()
      for (const t of terms) if (low.includes(t.toLowerCase())) found.add(t)
    } else if (Array.isArray(v)) {
      v.forEach(walk)
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(walk)
    }
  }
  walk(payload)
  return [...found].map((t) => ({ type: 'banned_term' as const, detail: t }))
}
