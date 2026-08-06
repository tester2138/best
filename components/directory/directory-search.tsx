'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface DirectorySearchProps {
  onSearch: (query: string) => void
  onFilterChange: (filters: FilterState) => void
  onSortChange: (sortBy: string) => void
  countries: string[]
  regulators: string[]
  platforms: string[]
  totalResults: number
  activeFilters: FilterState
  defaultSearchValue?: string
  defaultSortValue?: string
}

export interface FilterState {
  category: string
  country: string
  regulator: string
  platform: string
  verificationStatus: string
  hasBonus: string
}

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'forex-broker', label: 'Forex Brokers' },
  { value: 'cfd-broker', label: 'CFD Brokers' },
  { value: 'prop-firm', label: 'Prop Firms' },
  { value: 'crypto-exchange', label: 'Crypto Exchanges' },
]

const verificationStatuses = [
  { value: 'all', label: 'All Statuses' },
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'sponsored', label: 'Sponsored' },
]

const sortOptions = [
  { value: 'featured', label: 'Featured First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'name', label: 'A to Z' },
  { value: 'newest', label: 'Recently Updated' },
  { value: 'min-deposit', label: 'Lowest Deposit' },
]

export function DirectorySearch({
  onSearch,
  onFilterChange,
  onSortChange,
  countries,
  regulators,
  platforms,
  totalResults,
  activeFilters,
  defaultSearchValue = '',
  defaultSortValue = 'rating',
}: DirectorySearchProps) {
  const [searchQuery, setSearchQuery] = useState(defaultSearchValue)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...activeFilters, [key]: value })
  }

  const clearFilters = () => {
    onFilterChange({
      category: 'all',
      country: 'all',
      regulator: 'all',
      platform: 'all',
      verificationStatus: 'all',
      hasBonus: 'all',
    })
    setSearchQuery('')
    onSearch('')
  }

  const activeFilterCount = Object.values(activeFilters).filter(v => v !== 'all').length

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Category</label>
        <Select value={activeFilters.category} onValueChange={(v) => handleFilterChange('category', v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Country Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Country</label>
        <Select value={activeFilters.country} onValueChange={(v) => handleFilterChange('country', v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Regulator Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Regulator</label>
        <Select value={activeFilters.regulator} onValueChange={(v) => handleFilterChange('regulator', v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Regulators" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regulators</SelectItem>
            {regulators.slice(0, 20).map((reg) => (
              <SelectItem key={reg} value={reg}>{reg}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Platform Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Platform</label>
        <Select value={activeFilters.platform} onValueChange={(v) => handleFilterChange('platform', v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map((platform) => (
              <SelectItem key={platform} value={platform}>{platform}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Verification Status Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Verification Status</label>
        <Select value={activeFilters.verificationStatus} onValueChange={(v) => handleFilterChange('verificationStatus', v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {verificationStatuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bonus Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Bonus Availability</label>
        <Select value={activeFilters.hasBonus} onValueChange={(v) => handleFilterChange('hasBonus', v)}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Has Bonus</SelectItem>
            <SelectItem value="no">No Bonus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          <X className="w-4 h-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by broker name, country, regulator, platform or trading type..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 h-12 text-base"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Filters Button */}
        <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="lg" className="sm:hidden gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filter Directory</SheetTitle>
            </SheetHeader>
            <div className="mt-6 pb-6 overflow-y-auto">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>

        {/* Sort Select */}
        <Select defaultValue={defaultSortValue} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-12">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Filters Row */}
      <div className="hidden sm:flex flex-wrap gap-2 items-center">
        {/* Quick Category Buttons */}
        {categories.map((cat) => (
          <Button
            key={cat.value}
            variant={activeFilters.category === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('category', cat.value)}
            className={cn(
              activeFilters.category === cat.value && 'bg-primary hover:bg-primary/90'
            )}
          >
            {cat.label}
          </Button>
        ))}

        <div className="h-6 w-px bg-border mx-2" />

        {/* Advanced Filters Dropdown */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              More Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs bg-primary/10 text-primary">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Directory</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}

        <div className="flex-1" />

        {/* Results Count */}
        <span className="text-sm text-muted-foreground">
          {totalResults} {totalResults === 1 ? 'company' : 'companies'} found
        </span>
      </div>
    </div>
  )
}
