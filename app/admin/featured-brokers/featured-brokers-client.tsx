'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, Save } from 'lucide-react'
import { toast } from 'sonner'
import { updateHomepageFeaturedBrokers } from '@/app/actions/homepage-featured-brokers'
import { BrokerLogo } from '@/components/brokers/broker-logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { HomepageFeaturedBrokerOption } from '@/lib/homepage-featured-brokers'

const MAX_VISIBLE_OPTIONS = 40

type FeaturedBrokersClientProps = {
  options: HomepageFeaturedBrokerOption[]
  initialSlugs: [string, string]
}

export function FeaturedBrokersClient({ options, initialSlugs }: FeaturedBrokersClientProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selectedSlugs, setSelectedSlugs] = useState<[string, string]>(initialSlugs)
  const [savedSlugs, setSavedSlugs] = useState<[string, string]>(initialSlugs)
  const hasChanges =
    selectedSlugs[0] !== savedSlugs[0] || selectedSlugs[1] !== savedSlugs[1]

  function setSlot(slot: 0 | 1, slug: string) {
    setSelectedSlugs((current) => {
      const next: [string, string] = [...current]
      next[slot] = slug
      return next
    })
  }

  function save() {
    startTransition(async () => {
      const result = await updateHomepageFeaturedBrokers({
        firstSlug: selectedSlugs[0],
        secondSlug: selectedSlugs[1],
      })

      if (!result.ok) {
        toast.error(result.error ?? 'Could not update the homepage featured brokers.')
        return
      }

      const saved: [string, string] = [...selectedSlugs]
      setSavedSlugs(saved)
      toast.success('Homepage featured brokers updated.')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FeaturedBrokerSlotCard
          title="First card"
          description="Displayed first on mobile and on the left on desktop."
          slotLabel="Featured position 1"
          id="featured-broker-first"
          value={selectedSlugs[0]}
          excludedSlug={selectedSlugs[1]}
          options={options}
          onChange={(slug) => setSlot(0, slug)}
        />
        <FeaturedBrokerSlotCard
          title="Second card"
          description="Displayed second on mobile and on the right on desktop."
          slotLabel="Featured position 2"
          id="featured-broker-second"
          value={selectedSlugs[1]}
          excludedSlug={selectedSlugs[0]}
          options={options}
          onChange={(slug) => setSlot(1, slug)}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {hasChanges
            ? 'You have unsaved changes to the homepage featured section.'
            : 'The homepage featured section is up to date.'}
        </p>
        <Button
          type="button"
          onClick={save}
          disabled={pending || !hasChanges || selectedSlugs[0] === selectedSlugs[1]}
        >
          <Save data-icon="inline-start" />
          {pending ? 'Saving…' : 'Save featured brokers'}
        </Button>
      </div>
    </div>
  )
}

function FeaturedBrokerSlotCard({
  title,
  description,
  slotLabel,
  id,
  value,
  excludedSlug,
  options,
  onChange,
}: {
  title: string
  description: string
  slotLabel: string
  id: string
  value: string
  excludedSlug: string
  options: HomepageFeaturedBrokerOption[]
  onChange: (slug: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <CardTitle role="heading" aria-level={2}>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">{slotLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={id}>Broker brand</FieldLabel>
            <BrokerPicker
              id={id}
              slotLabel={slotLabel}
              value={value}
              excludedSlug={excludedSlug}
              options={options}
              onChange={onChange}
            />
            <FieldDescription>
              Search the broker directory by brand name or profile slug.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function BrokerPicker({
  id,
  slotLabel,
  value,
  excludedSlug,
  options,
  onChange,
}: {
  id: string
  slotLabel: string
  value: string
  excludedSlug: string
  options: HomepageFeaturedBrokerOption[]
  onChange: (slug: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = options.find((option) => option.slug === value)
  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return options
      .filter((option) => {
        if (option.slug === excludedSlug) return false
        if (!normalizedSearch) return true
        return `${option.name} ${option.slug}`.toLowerCase().includes(normalizedSearch)
      })
      .slice(0, MAX_VISIBLE_OPTIONS)
  }, [excludedSlug, options, search])

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={`${slotLabel}: ${selected?.name ?? 'Choose a broker'}`}
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-3">
              <BrokerLogo
                name={selected.name}
                slug={selected.slug}
                logoUrl={selected.logoUrl}
                websiteUrl={selected.websiteUrl}
                size="sm"
              />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Choose a broker</span>
          )}
          <ChevronsUpDown data-icon="inline-end" className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            aria-label="Search broker directory"
            placeholder="Search by brand or slug…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filteredOptions.length === 0 ? (
              <CommandEmpty>No brokers match that search.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.slug}
                    value={option.slug}
                    disabled={option.slug === excludedSlug}
                    onSelect={() => {
                      onChange(option.slug)
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    <BrokerLogo
                      name={option.name}
                      slug={option.slug}
                      logoUrl={option.logoUrl}
                      websiteUrl={option.websiteUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                    <span className="max-w-28 truncate text-xs text-muted-foreground">
                      {option.slug}
                    </span>
                    <Check
                      aria-hidden="true"
                      className={value === option.slug ? 'opacity-100' : 'opacity-0'}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          {filteredOptions.length === MAX_VISIBLE_OPTIONS && (
            <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Showing the first {MAX_VISIBLE_OPTIONS} matches. Type more to narrow your search.
            </p>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
