export interface EditorialContentModelEntry {
  kind: string
  slug: string
  title: string
  status: string
  sortOrder: number
}

export function mergeEditorialContentEntries<T extends EditorialContentModelEntry>(
  defaults: T[],
  stored: T[],
  includeDrafts: boolean,
): T[] {
  const defaultKeys = new Set(defaults.map((entry) => `${entry.kind}:${entry.slug}`))
  const storedByKey = new Map(stored.map((entry) => [`${entry.kind}:${entry.slug}`, entry]))
  const merged = defaults.map((entry) => {
    const override = storedByKey.get(`${entry.kind}:${entry.slug}`)
    return override && (includeDrafts || override.status !== 'draft') ? override : entry
  })

  for (const entry of stored) {
    if (!defaultKeys.has(`${entry.kind}:${entry.slug}`) && (includeDrafts || entry.status !== 'draft')) {
      merged.push(entry)
    }
  }

  return merged.sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) ||
      a.sortOrder - b.sortOrder ||
      a.title.localeCompare(b.title) ||
      a.slug.localeCompare(b.slug),
  )
}
