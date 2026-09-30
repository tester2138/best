'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { diffOverrides } from '@/lib/admin-overrides'
import {
  clearAdminProfileOverrides,
  saveAdminPlacement,
  saveAdminProfileOverrides,
} from '@/app/actions/admin-profile'

export interface PlacementState {
  name: string
  verification_status: 'verified' | 'unverified'
  is_sponsored: boolean
  is_featured: boolean
  is_duplicate: boolean
  needs_manual_review: boolean
  display_rank: number | null
  brand_category: string | null
  brand_status: string | null
  regulator_tier: string | null
  internal_priority: string | null
  internal_notes: string | null
}

interface ProfileEditorProps {
  slug: string
  displayName: string
  hasPortalRecord: boolean
  base: Record<string, unknown>
  values: Record<string, unknown>
  overridesUpdatedAt: string | null
  placement: PlacementState | null
  canManageProfile: boolean
  canManagePlacement: boolean
}

type Values = Record<string, unknown>

/* ── field configuration ─────────────────────────────────────────────────── */

interface FieldDef {
  path: string
  label: string
  hint?: string
  min?: number
  max?: number
  step?: number
}

const TEXT_FIELDS: Record<string, FieldDef[]> = {
  company: [
    { path: 'name', label: 'Public display name' },
    { path: 'legalName', label: 'Legal name' },
    { path: 'logoUrl', label: 'Logo URL' },
    { path: 'websiteUrl', label: 'Website URL' },
    { path: 'affiliateUrl', label: 'Affiliate URL', hint: 'Leave empty for none' },
    { path: 'headquarters', label: 'Headquarters' },
    { path: 'country', label: 'Country' },
    { path: 'category', label: 'Category', hint: 'forex-broker, cfd-broker, prop-firm, crypto-exchange, multi-asset' },
    { path: 'entityType', label: 'Entity type', hint: 'forex_broker, cfd_broker, prop_firm, exchange, hedge_fund, bank_desk, clearing, investment_bank, prediction_market, other' },
    { path: 'dataQualityStage', label: 'Data quality stage', hint: 'basic, enriched, reviewed, claimed, featured' },
  ],
  trading: [
    { path: 'currencyPairs', label: 'Currency pairs' },
    { path: 'minDeposit', label: 'Minimum deposit' },
    { path: 'spreadsFrom', label: 'Spreads from' },
    { path: 'commissions', label: 'Commissions' },
    { path: 'maxLeverageRetail', label: 'Max leverage (retail)' },
    { path: 'maxLeverageProfessional', label: 'Max leverage (professional)' },
    { path: 'withdrawalTime', label: 'Withdrawal time' },
    { path: 'inactivityFee', label: 'Inactivity fee' },
    { path: 'bonusSummary', label: 'Bonus summary' },
  ],
  regulation: [{ path: 'regulationSummary', label: 'Regulation summary' }],
  review: [
    { path: 'reviewerName', label: 'Reviewer name' },
    { path: 'reviewDate', label: 'Review date (ISO)' },
    { path: 'updateDate', label: 'Last updated (ISO)' },
  ],
  ratings: [{ path: 'ratingLabel', label: 'Rating label' }],
  metadata: [
    { path: 'lastVerifiedAt', label: 'Last verified (ISO)' },
    { path: 'lastUpdatedAt', label: 'Last updated (ISO)' },
    { path: 'createdAt', label: 'Created at (ISO)' },
  ],
}

const LONG_FIELDS: Record<string, FieldDef[]> = {
  company: [
    { path: 'shortDescription', label: 'Short description' },
    { path: 'longDescription', label: 'Long description' },
  ],
  review: [
    { path: 'reviewBody', label: 'Full review body', hint: 'HTML is sanitized on the public profile; use headings, paragraphs, lists and links.' },
  ],
}

const NUMBER_FIELDS: Record<string, FieldDef[]> = {
  company: [{ path: 'foundedYear', label: 'Founded year', min: 1600, max: 2200, step: 1 }],
  ratings: [
    { path: 'rating', label: 'Editorial rating (0–10)', min: 0, max: 10, step: 0.1 },
    { path: 'rank', label: 'Editorial rank', min: 1, max: 999999, step: 1 },
  ],
}

const BOOLEAN_FIELDS: Record<string, FieldDef[]> = {
  trading: [{ path: 'hasBonus', label: 'Has a current bonus or offer' }],
}

const LIST_FIELDS: Record<string, FieldDef[]> = {
  company: [{ path: 'badges', label: 'Badges' }],
  trading: [
    { path: 'platforms', label: 'Platforms' },
    { path: 'instruments', label: 'Instruments' },
    { path: 'depositMethods', label: 'Deposit methods' },
    { path: 'withdrawalMethods', label: 'Withdrawal methods' },
    { path: 'mobileApps', label: 'Mobile apps' },
    { path: 'countriesServed', label: 'Countries served' },
    { path: 'restrictedCountries', label: 'Restricted countries' },
  ],
  review: [
    { path: 'pros', label: 'Pros' },
    { path: 'cons', label: 'Cons' },
    { path: 'expandedPros', label: 'Expanded pros' },
    { path: 'expandedCons', label: 'Expanded cons' },
    { path: 'bestFor', label: 'Best for' },
  ],
  metadata: [{ path: 'sourceUrls', label: 'Source URLs' }],
}

const JSON_FIELDS: Record<string, FieldDef[]> = {
  trading: [
    { path: 'accountTypes', label: 'Account types', hint: '[{ name, minDeposit, spreadsFrom, commission, leverage, features[] }]' },
    { path: 'testedSpreads', label: 'Tested spreads', hint: '[{ instrument, spread, tested }]' },
    { path: 'feesTable', label: 'Fees table', hint: '[{ instrument, spread, commission }]' },
    { path: 'platformBreakdown', label: 'Platform breakdown', hint: '[{ name, description }]' },
    { path: 'propFirmDetails', label: 'Prop firm details', hint: 'Challenge, account-size, drawdown, trading-rule and refund details' },
    { path: 'bonuses', label: 'Bonuses', hint: '[{ title, description, type, value, terms, code, expiresAt }]' },
  ],
  regulation: [
    { path: 'regulators', label: 'Regulators', hint: 'Array of strings or { authority, country, licenseNumber } objects' },
  ],
  faqs: [
    { path: 'faqItems', label: 'FAQ items', hint: '[{ question, answer }] — feeds the public FAQ accordion and FAQPage schema' },
  ],
  ratings: [
    {
      path: 'scores',
      label: 'Score components',
      hint: '{ overall, trustSafety, tradingConditions, platforms, researchEducation, customerService, mobileTrading } — each score 0–10',
    },
    { path: 'trustpilot', label: 'Trustpilot data', hint: '{ score, totalReviews, oneStarPercentage? }' },
  ],
  seo: [
    {
      path: 'seo',
      label: 'SEO overrides',
      hint: '{ metaTitle, metaDescription, h1, faqSchema[] }',
    },
  ],
}

const TABS = ['company', 'trading', 'regulation', 'review', 'faqs', 'ratings', 'seo', 'metadata', 'placement']
const TAB_LABELS: Record<string, string> = {
  company: 'Company',
  trading: 'Trading conditions',
  regulation: 'Regulation',
  review: 'Review',
  faqs: 'FAQs',
  ratings: 'Ratings & scores',
  seo: 'SEO',
  metadata: 'Sources & dates',
  placement: 'Placement & ranking',
}

/* ── path helpers ────────────────────────────────────────────────────────── */

function getPath(obj: Values, path: string): unknown {
  let cur: unknown = obj
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Values)[part]
  }
  return cur
}

function setPath(obj: Values, path: string, value: unknown): Values {
  const parts = path.split('.')
  const clone: Values = { ...obj }
  let cur: Values = clone
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]]
    cur[parts[i]] = next && typeof next === 'object' ? { ...(next as Values) } : {}
    cur = cur[parts[i]] as Values
  }
  cur[parts[parts.length - 1]] = value
  return clone
}

/* ── field components ────────────────────────────────────────────────────── */

function OverrideBadge({ base, value }: { base: unknown; value: unknown }) {
  const overridden = JSON.stringify(value ?? null) !== JSON.stringify(base ?? null)
  if (!overridden) return null
  return (
    <Badge variant="secondary" className="ml-2">
      Override
    </Badge>
  )
}

function TextField({
  def,
  base,
  values,
  onChange,
  disabled,
}: {
  def: FieldDef
  base: Values
  values: Values
  onChange: (value: string) => void
  disabled: boolean
}) {
  const raw = getPath(values, def.path)
  const text = raw === undefined || raw === null ? '' : String(raw)
  return (
    <Field>
      <FieldLabel htmlFor={`f-${def.path}`}>
        {def.label}
        <OverrideBadge base={getPath(base, def.path)} value={raw} />
      </FieldLabel>
      <Input
        id={`f-${def.path}`}
        value={text}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {def.hint ? <FieldDescription>{def.hint}</FieldDescription> : null}
    </Field>
  )
}

function NumberField({
  def,
  base,
  values,
  onChange,
  disabled,
}: {
  def: FieldDef
  base: Values
  values: Values
  onChange: (value: number | undefined) => void
  disabled: boolean
}) {
  const raw = getPath(values, def.path)
  return (
    <Field>
      <FieldLabel htmlFor={`f-${def.path}`}>
        {def.label}
        <OverrideBadge base={getPath(base, def.path)} value={raw} />
      </FieldLabel>
      <Input
        id={`f-${def.path}`}
        type="number"
        min={def.min}
        max={def.max}
        step={def.step}
        value={typeof raw === 'number' ? raw : ''}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value === '') onChange(undefined)
          else if (Number.isFinite(event.target.valueAsNumber)) onChange(event.target.valueAsNumber)
        }}
      />
      {def.hint ? <FieldDescription>{def.hint}</FieldDescription> : null}
    </Field>
  )
}

function BooleanField({
  def,
  base,
  values,
  onChange,
  disabled,
}: {
  def: FieldDef
  base: Values
  values: Values
  onChange: (value: boolean) => void
  disabled: boolean
}) {
  const raw = getPath(values, def.path)
  return (
    <Field orientation="horizontal">
      <Switch
        id={`f-${def.path}`}
        checked={raw === true}
        disabled={disabled}
        onCheckedChange={onChange}
      />
      <div>
        <FieldLabel htmlFor={`f-${def.path}`}>
          {def.label}
          <OverrideBadge base={getPath(base, def.path)} value={raw} />
        </FieldLabel>
        {def.hint ? <FieldDescription>{def.hint}</FieldDescription> : null}
      </div>
    </Field>
  )
}

function LongField({
  def,
  base,
  values,
  onChange,
  disabled,
}: {
  def: FieldDef
  base: Values
  values: Values
  onChange: (value: string) => void
  disabled: boolean
}) {
  const raw = getPath(values, def.path)
  const text = raw === undefined || raw === null ? '' : String(raw)
  return (
    <Field>
      <FieldLabel htmlFor={`f-${def.path}`}>
        {def.label}
        <OverrideBadge base={getPath(base, def.path)} value={raw} />
      </FieldLabel>
      <Textarea
        id={`f-${def.path}`}
        value={text}
        rows={4}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {def.hint ? <FieldDescription>{def.hint}</FieldDescription> : null}
    </Field>
  )
}

function ListField({
  def,
  base,
  values,
  onChange,
  disabled,
}: {
  def: FieldDef
  base: Values
  values: Values
  onChange: (value: string[]) => void
  disabled: boolean
}) {
  const raw = getPath(values, def.path)
  const text = Array.isArray(raw) ? raw.map(String).join('\n') : ''
  return (
    <Field>
      <FieldLabel htmlFor={`f-${def.path}`}>
        {def.label}
        <OverrideBadge base={getPath(base, def.path)} value={raw} />
      </FieldLabel>
      <Textarea
        id={`f-${def.path}`}
        value={text}
        rows={4}
        disabled={disabled}
        placeholder="One per line"
        onChange={(event) =>
          onChange(
            event.target.value
              .split('\n')
              .map((entry) => entry.trim())
              .filter(Boolean),
          )
        }
      />
      <FieldDescription>One entry per line.</FieldDescription>
    </Field>
  )
}

function JsonField({
  def,
  base,
  values,
  text,
  onTextChange,
  onChange,
  disabled,
}: {
  def: FieldDef
  base: Values
  values: Values
  text: string
  onTextChange: (text: string) => void
  onChange: (value: unknown, valid: boolean) => void
  disabled: boolean
}) {
  const raw = getPath(values, def.path)
  let error: string | null = null
  if (text.trim() !== '') {
    try {
      JSON.parse(text)
    } catch {
      error = 'Invalid JSON — fix this field before saving.'
    }
  }

  function handleTextChange(next: string) {
    onTextChange(next)
    if (next.trim() === '') {
      onChange(undefined, true)
      return
    }
    try {
      onChange(JSON.parse(next), true)
    } catch {
      onChange(undefined, false)
    }
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={`f-${def.path}`}>
        {def.label}
        <OverrideBadge base={getPath(base, def.path)} value={raw} />
      </FieldLabel>
      <Textarea
        id={`f-${def.path}`}
        value={text}
        rows={8}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className="font-mono text-xs"
        onChange={(event) => handleTextChange(event.target.value)}
      />
      {error ? (
        <FieldDescription>{error}</FieldDescription>
      ) : def.hint ? (
        <FieldDescription>{def.hint}</FieldDescription>
      ) : null}
    </Field>
  )
}

/* ── main editor ─────────────────────────────────────────────────────────── */

export function ProfileEditor({
  slug,
  displayName,
  hasPortalRecord,
  base,
  values: initialValues,
  overridesUpdatedAt,
  placement: initialPlacement,
  canManageProfile,
  canManagePlacement,
}: ProfileEditorProps) {
  const router = useRouter()
  const [values, setValues] = useState<Values>(initialValues)
  const [placement, setPlacement] = useState<PlacementState>(
    initialPlacement ?? {
      name: displayName,
      verification_status: 'unverified',
      is_sponsored: false,
      is_featured: false,
      is_duplicate: false,
      needs_manual_review: false,
      display_rank: null,
      brand_category: null,
      brand_status: null,
      regulator_tier: null,
      internal_priority: null,
      internal_notes: null,
    },
  )
  const [status, setStatus] = useState<string | null>(null)
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({})
  const [invalidJsonPaths, setInvalidJsonPaths] = useState<Set<string>>(() => new Set())
  const [pending, startTransition] = useTransition()

  const overrideCount = useMemo(
    () => Object.keys(diffOverrides(base, values)).length,
    [base, values],
  )

  function runAction(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
    onSuccess?: () => void,
  ) {
    setStatus(null)
    startTransition(async () => {
      try {
        const result = await fn()
        if (result.ok) {
          onSuccess?.()
          setStatus(success)
          router.refresh()
        } else {
          setStatus(result.error ?? 'Something went wrong')
        }
      } catch {
        setStatus('Something went wrong')
      }
    })
  }

  function saveOverrides() {
    if (invalidJsonPaths.size > 0) {
      setStatus('Fix invalid JSON fields before saving.')
      return
    }
    const payload = diffOverrides(base, values)
    runAction(
      () => saveAdminProfileOverrides({ slug, overrides: payload }),
      `Saved — ${Object.keys(payload).length} override field(s) applied to the public profile.`,
    )
  }

  function clearOverrides() {
    runAction(
      () => clearAdminProfileOverrides({ slug }),
      'Overrides cleared — profile shows its public base data again.',
      () => {
        setValues(base)
        setJsonDrafts({})
        setInvalidJsonPaths(new Set())
      },
    )
  }

  function savePlacement() {
    runAction(
      () =>
        saveAdminPlacement({
          slug,
          name: placement.name || displayName,
          verification_status: placement.verification_status,
          is_sponsored: placement.is_sponsored,
          is_featured: placement.is_featured,
          is_duplicate: placement.is_duplicate,
          needs_manual_review: placement.needs_manual_review,
          display_rank: placement.display_rank,
          brand_category: placement.brand_category,
          brand_status: placement.brand_status,
          regulator_tier: placement.regulator_tier,
          internal_priority: placement.internal_priority,
          internal_notes: placement.internal_notes,
        }),
      'Placement saved — directory ranking and badges update on the public site.',
    )
  }

  const bind = (def: FieldDef) => ({
    def,
    base,
    values,
    disabled: !canManageProfile || pending,
    onChangeText: (v: string) => setValues((prev) => setPath(prev, def.path, v)),
  })

  function getJsonText(path: string): string {
    if (Object.prototype.hasOwnProperty.call(jsonDrafts, path)) return jsonDrafts[path]
    const raw = getPath(values, path)
    return raw === undefined ? '' : JSON.stringify(raw, null, 2) ?? ''
  }

  function updateJsonField(path: string, value: unknown, valid: boolean) {
    setInvalidJsonPaths((current) => {
      const next = new Set(current)
      if (valid) next.delete(path)
      else next.add(path)
      return next
    })
    if (valid) setValues((prev) => setPath(prev, path, value))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col">
          <span className="text-lg font-semibold">{displayName}</span>
          <span className="text-sm text-muted-foreground">
            /brokers/{slug}
            {hasPortalRecord ? '' : ' · catalog-only (no portal record yet)'}
            {overridesUpdatedAt ? ` · overrides updated ${new Date(overridesUpdatedAt).toLocaleString()}` : ''}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {overrideCount > 0 ? (
            <Badge variant="secondary">
              {overrideCount} override field{overrideCount === 1 ? '' : 's'}
            </Badge>
          ) : null}
          <Button variant="outline" size="sm" disabled={!canManageProfile || pending || overrideCount === 0} onClick={clearOverrides}>
            Clear overrides
          </Button>
          <Button
            size="sm"
            disabled={!canManageProfile || pending || invalidJsonPaths.size > 0}
            onClick={saveOverrides}
          >
            Save profile overrides
          </Button>
        </div>
      </div>
      {status ? (
        <p role="status" className="text-sm text-muted-foreground">
          {status}
        </p>
      ) : null}
      {!canManageProfile && !canManagePlacement ? (
        <p className="text-sm text-muted-foreground">
          Your role can view broker profiles but cannot edit editorial data or placement.
        </p>
      ) : !canManageProfile ? (
        <p className="text-sm text-muted-foreground">
          Editorial profile fields require editorial:write. Your role can still manage placement.
        </p>
      ) : !canManagePlacement ? (
        <p className="text-sm text-muted-foreground">
          Placement controls require brokers:manage. Your role can still edit editorial profile fields.
        </p>
      ) : null}

      <Tabs defaultValue="company" className="gap-4">
        <TabsList className="grid h-auto w-full grid-cols-2 justify-start gap-1 p-1 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="h-auto min-h-8 w-full flex-none whitespace-normal text-center leading-tight"
            >
              {TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
            {tab === 'placement' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Placement &amp; ranking</CardTitle>
                  <CardDescription>
                    Sponsored and featured are commercial visibility controls. Editorial ratings and
                    score components live separately under Ratings &amp; scores; display_rank controls
                    directory ordering within each tier.
                    {hasPortalRecord ? '' : ' Saving creates a portal record for this catalog-only broker.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup className="max-w-3xl">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="p-name">Brand name</FieldLabel>
                        <Input
                          id="p-name"
                          value={placement.name}
                          disabled={!canManagePlacement || pending}
                          onChange={(e) => setPlacement((p) => ({ ...p, name: e.target.value }))}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="p-verification">Verification status</FieldLabel>
                        <Input
                          id="p-verification"
                          value={placement.verification_status}
                          disabled={!canManagePlacement || pending}
                          onChange={(e) =>
                            setPlacement((p) => ({
                              ...p,
                              verification_status: e.target.value === 'verified' ? 'verified' : 'unverified',
                            }))
                          }
                        />
                        <FieldDescription>verified or unverified.</FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="p-rank">Display rank</FieldLabel>
                        <Input
                          id="p-rank"
                          type="number"
                          min={1}
                          value={placement.display_rank ?? ''}
                          disabled={!canManagePlacement || pending}
                          onChange={(e) =>
                            setPlacement((p) => ({
                              ...p,
                              display_rank: e.target.value === '' ? null : Number(e.target.value),
                            }))
                          }
                        />
                        <FieldDescription>Lower = higher prominence. Empty = end of list.</FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="p-category">Brand category</FieldLabel>
                        <Input
                          id="p-category"
                          value={placement.brand_category ?? ''}
                          disabled={!canManagePlacement || pending}
                          onChange={(e) => setPlacement((p) => ({ ...p, brand_category: e.target.value || null }))}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="p-status">Brand status</FieldLabel>
                        <Input
                          id="p-status"
                          value={placement.brand_status ?? ''}
                          disabled={!canManagePlacement || pending}
                          onChange={(e) => setPlacement((p) => ({ ...p, brand_status: e.target.value || null }))}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="p-tier">Regulator tier</FieldLabel>
                        <Input
                          id="p-tier"
                          value={placement.regulator_tier ?? ''}
                          disabled={!canManagePlacement || pending}
                          onChange={(e) => setPlacement((p) => ({ ...p, regulator_tier: e.target.value || null }))}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="p-priority">Internal priority</FieldLabel>
                        <Input
                          id="p-priority"
                          value={placement.internal_priority ?? ''}
                          disabled={!canManagePlacement || pending}
                          onChange={(e) => setPlacement((p) => ({ ...p, internal_priority: e.target.value || null }))}
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ['is_sponsored', 'Sponsored (paid placement)'],
                          ['is_featured', 'Featured'],
                          ['is_duplicate', 'Excluded duplicate (hidden + noindex)'],
                          ['needs_manual_review', 'Needs manual review'],
                        ] as const
                      ).map(([key, label]) => (
                        <Field key={key} orientation="horizontal">
                          <Switch
                            id={`p-${key}`}
                            checked={placement[key]}
                            disabled={!canManagePlacement || pending}
                            onCheckedChange={(checked) => setPlacement((p) => ({ ...p, [key]: checked }))}
                          />
                          <FieldLabel htmlFor={`p-${key}`} className="font-normal">
                            {label}
                          </FieldLabel>
                        </Field>
                      ))}
                    </div>
                    <Field>
                      <FieldLabel htmlFor="p-notes">Internal notes</FieldLabel>
                      <Textarea
                        id="p-notes"
                        rows={3}
                        value={placement.internal_notes ?? ''}
                        disabled={!canManagePlacement || pending}
                        onChange={(e) => setPlacement((p) => ({ ...p, internal_notes: e.target.value || null }))}
                      />
                    </Field>
                    <div>
                      <Button size="sm" disabled={!canManagePlacement || pending} onClick={savePlacement}>
                        Save placement
                      </Button>
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{TAB_LABELS[tab]}</CardTitle>
                  <CardDescription>
                    Edits here override the catalog for this broker on the public site. Fields
                    marked “Override” differ from the catalog.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup className="max-w-3xl">
                    {(TEXT_FIELDS[tab] ?? []).map((def) => (
                      <TextField
                        key={def.path}
                        {...bind(def)}
                        onChange={(v) => bind(def).onChangeText(v)}
                      />
                    ))}
                    {(LONG_FIELDS[tab] ?? []).map((def) => (
                      <LongField
                        key={def.path}
                        {...bind(def)}
                        onChange={(v) => bind(def).onChangeText(v)}
                      />
                    ))}
                    {(NUMBER_FIELDS[tab] ?? []).map((def) => (
                      <NumberField
                        key={def.path}
                        def={def}
                        base={base}
                        values={values}
                        disabled={!canManageProfile || pending}
                        onChange={(value) =>
                          setValues((prev) => setPath(prev, def.path, value))
                        }
                      />
                    ))}
                    {(BOOLEAN_FIELDS[tab] ?? []).map((def) => (
                      <BooleanField
                        key={def.path}
                        def={def}
                        base={base}
                        values={values}
                        disabled={!canManageProfile || pending}
                        onChange={(value) =>
                          setValues((prev) => setPath(prev, def.path, value))
                        }
                      />
                    ))}
                    {(LIST_FIELDS[tab] ?? []).map((def) => (
                      <ListField
                        key={def.path}
                        {...bind(def)}
                        onChange={(v) => setValues((prev) => setPath(prev, def.path, v))}
                      />
                    ))}
                    {(JSON_FIELDS[tab] ?? []).map((def) => (
                      <JsonField
                        key={def.path}
                        def={def}
                        base={base}
                        values={values}
                        text={getJsonText(def.path)}
                        onTextChange={(text) =>
                          setJsonDrafts((prev) => ({ ...prev, [def.path]: text }))
                        }
                        disabled={!canManageProfile || pending}
                        onChange={(value, valid) => updateJsonField(def.path, value, valid)}
                      />
                    ))}
                  </FieldGroup>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
