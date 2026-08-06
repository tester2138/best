'use client'

import { useMemo, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { DirectorySearch, FilterState } from '@/components/directory/directory-search'
import { DirectoryListingCard } from '@/components/directory/directory-listing-card'
import { AdSlot } from '@/components/ads/ad-slot'
import { searchDirectory } from '@/data/directory'
import type { DirectoryCompany } from '@/lib/directory-types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DirectoryClientProps {
  initialCompanies: DirectoryCompany[]
  allCompanies: DirectoryCompany[]
  countries: string[]
  regulators: string[]
  platforms: string[]
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalResults: number
  /** Search query already decoded server-side — used to prevent SSR/hydration mismatch */
  serverSearchQuery?: string
}

export function DirectoryClient({
  initialCompanies,
  allCompanies,
  countries,
  regulators,
  platforms,
  currentPage,
  totalPages,
  itemsPerPage,
  totalResults,
  serverSearchQuery = '',
}: DirectoryClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Read active filters from URL — fall back to the server-decoded query
  // so the first render (before hydration) agrees with what the server sent.
  const searchQuery = searchParams.get('q') ?? serverSearchQuery
  const filters: FilterState = {
    category: (searchParams.get('category') as FilterState['category']) ?? 'all',
    country: searchParams.get('country') ?? 'all',
    regulator: searchParams.get('regulator') ?? 'all',
    platform: searchParams.get('platform') ?? 'all',
    verificationStatus: (searchParams.get('verificationStatus') as FilterState['verificationStatus']) ?? 'all',
    hasBonus: (searchParams.get('hasBonus') as FilterState['hasBonus']) ?? 'all',
  }
  const sortBy = searchParams.get('sort') ?? 'rating'

  // When filters/search active, filter client-side and paginate in-memory
  const isFiltering = searchQuery || Object.values(filters).some(v => v !== 'all') || sortBy !== 'rating'

  const filteredCompanies = useMemo(() => {
    if (!isFiltering) return initialCompanies
    return searchDirectory(
      searchQuery,
      {
        category: filters.category,
        country: filters.country,
        regulator: filters.regulator,
        platform: filters.platform,
        verificationStatus: filters.verificationStatus,
        hasBonus: filters.hasBonus === 'yes' ? true : filters.hasBonus === 'no' ? false : undefined,
      },
      sortBy,
      'desc',
      allCompanies
    )
  }, [searchQuery, filters, sortBy, isFiltering, initialCompanies, allCompanies])

  const displayCompanies = isFiltering
    ? filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : initialCompanies

  const activeTotalPages = isFiltering
    ? Math.max(1, Math.ceil(filteredCompanies.length / itemsPerPage))
    : totalPages

  const activeTotalResults = isFiltering ? filteredCompanies.length : totalResults

  // Build URL helper — preserves all params, replaces page
  const buildPageUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (page === 1) {
        params.delete('page')
      } else {
        params.set('page', String(page))
      }
      const qs = params.toString()
      return qs ? `${pathname}?${qs}` : pathname
    },
    [pathname, searchParams]
  )

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page') // always reset to page 1 on filter/sort/search change
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === 'all' || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const handleSearch = (query: string) => pushParams({ q: query })
  const handleFilterChange = (newFilters: FilterState) => {
    pushParams({
      category: newFilters.category,
      country: newFilters.country,
      regulator: newFilters.regulator,
      platform: newFilters.platform,
      verificationStatus: newFilters.verificationStatus,
      hasBonus: newFilters.hasBonus,
    })
  }
  const handleSortChange = (newSort: string) => pushParams({ sort: newSort })

  // Pagination window: show 5 page numbers centred on current
  const pageWindow = useMemo(() => {
    const delta = 2
    const range: number[] = []
    const left = Math.max(1, currentPage - delta)
    const right = Math.min(activeTotalPages, currentPage + delta)
    for (let i = left; i <= right; i++) range.push(i)
    return range
  }, [currentPage, activeTotalPages])

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <DirectorySearch
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        countries={countries}
        regulators={regulators}
        platforms={platforms}
        totalResults={activeTotalResults}
        activeFilters={filters}
        defaultSearchValue={searchQuery}
        defaultSortValue={sortBy}
      />

      {/* Results */}
      <div className="space-y-3">
        {displayCompanies.length > 0 ? (
          <>
            {displayCompanies.map((company, idx) => (
              <div key={company.id}>
                <DirectoryListingCard
                  company={company}
                  rank={sortBy === 'rating' || sortBy === 'featured' ? (currentPage - 1) * itemsPerPage + idx + 1 : undefined}
                />
                {/* Inline ad every 5 listings */}
                {(idx + 1) % 5 === 0 && idx < displayCompanies.length - 1 && (
                  <div className="my-4 flex justify-center">
                    <AdSlot placementKey="horizontal-1" fluid />
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg font-medium text-foreground">No companies found</p>
            <p className="text-muted-foreground mt-2">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
          </div>
        )}
      </div>

      {/* Pagination Nav — Row 157: stepped jump links (10,20…) + First/Last */}
      {activeTotalPages > 1 && (
        <nav
          aria-label="Broker directory pagination"
          className="flex flex-col gap-3 pt-4 border-t border-border"
        >
          {/* Main row: Prev / window / Next */}
          <div className="flex items-center justify-between gap-2">
            {/* First + Prev */}
            <div className="flex items-center gap-1">
              {currentPage > 1 && (
                <a
                  href={buildPageUrl(1)}
                  aria-label="First page"
                  className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-secondary hover:border-primary/30 transition-colors"
                >
                  First
                </a>
              )}
              <a
                href={currentPage > 1 ? buildPageUrl(currentPage - 1) : undefined}
                aria-disabled={currentPage === 1}
                aria-label="Previous page"
                onClick={currentPage === 1 ? (e) => e.preventDefault() : undefined}
                className={[
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                  currentPage === 1
                    ? 'border-border text-muted-foreground pointer-events-none opacity-40'
                    : 'border-border text-foreground hover:bg-secondary hover:border-primary/30',
                ].join(' ')}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </a>
            </div>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {pageWindow[0] > 1 && (
                <>
                  <a href={buildPageUrl(1)} className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                    1
                  </a>
                  {pageWindow[0] > 2 && (
                    <span className="px-2 py-2 text-sm text-muted-foreground select-none">…</span>
                  )}
                </>
              )}

              {pageWindow.map((page) => (
                <a
                  key={page}
                  href={buildPageUrl(page)}
                  aria-current={page === currentPage ? 'page' : undefined}
                  className={[
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    page === currentPage
                      ? 'bg-primary text-primary-foreground pointer-events-none'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  ].join(' ')}
                >
                  {page}
                </a>
              ))}

              {pageWindow[pageWindow.length - 1] < activeTotalPages && (
                <>
                  {pageWindow[pageWindow.length - 1] < activeTotalPages - 1 && (
                    <span className="px-2 py-2 text-sm text-muted-foreground select-none">…</span>
                  )}
                  <a href={buildPageUrl(activeTotalPages)} className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                    {activeTotalPages}
                  </a>
                </>
              )}
            </div>

            {/* Next + Last */}
            <div className="flex items-center gap-1">
              <a
                href={currentPage < activeTotalPages ? buildPageUrl(currentPage + 1) : undefined}
                aria-disabled={currentPage === activeTotalPages}
                aria-label="Next page"
                onClick={currentPage === activeTotalPages ? (e) => e.preventDefault() : undefined}
                className={[
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                  currentPage === activeTotalPages
                    ? 'border-border text-muted-foreground pointer-events-none opacity-40'
                    : 'border-border text-foreground hover:bg-secondary hover:border-primary/30',
                ].join(' ')}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </a>
              {currentPage < activeTotalPages && (
                <a
                  href={buildPageUrl(activeTotalPages)}
                  aria-label="Last page"
                  className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-secondary hover:border-primary/30 transition-colors"
                >
                  Last
                </a>
              )}
            </div>
          </div>

          {/* Stepped jump row — only shown when there are enough pages (>12) to warrant it */}
          {activeTotalPages > 12 && (
            <div className="flex items-center justify-center gap-1 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Jump to page:</span>
              {Array.from({ length: Math.floor(activeTotalPages / 10) }, (_, i) => (i + 1) * 10)
                .filter(p => p <= activeTotalPages && p !== currentPage)
                .map(p => (
                  <a
                    key={p}
                    href={buildPageUrl(p)}
                    className="px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border"
                  >
                    {p}
                  </a>
                ))
              }
            </div>
          )}
        </nav>
      )}

      {/* Results count */}
      {activeTotalResults > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, activeTotalResults)} of {activeTotalResults} brokers
        </p>
      )}
    </div>
  )
}
