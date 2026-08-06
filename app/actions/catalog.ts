'use server'

import { requireAdmin } from '@/lib/guards'
import { run } from '@/lib/portal/result'
import { searchCatalog, type CatalogEntry } from '@/lib/catalog'

/**
 * Admin-only catalog search backing the AssignDialog combobox
 * (Blueprint Section 12.2, debounced 300ms / min 2 chars on the client).
 */
export async function searchCatalogAction(queryStr: string) {
  return run<CatalogEntry[]>(async () => {
    await requireAdmin()
    if (queryStr.trim().length < 2) return []
    return searchCatalog(queryStr, 20)
  })
}
