'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  BadgeCheck,
  Megaphone,
  Handshake,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Users,
  TrendingUp,
  Globe,
  ShieldCheck,
  Clock,
  ChevronRight,
  Star,
  BarChart3,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Intent types ─────────────────────────────────────────────────────────────

type Intent = 'claim' | 'partnership' | 'advertising' | 'general' | null

interface IntentCard {
  id: Intent
  icon: typeof BadgeCheck
  label: string
  sublabel: string
  color: string
  bg: string
  border: string
  badge?: string
}

const intents: IntentCard[] = [
  {
    id: 'claim',
    icon: BadgeCheck,
    label: 'Claim Your Brand',
    sublabel: 'Verify & manage your broker profile',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'Verification',
  },
  {
    id: 'partnership',
    icon: Handshake,
    label: 'Strategic Partnership',
    sublabel: 'Long-term collaborations & co-marketing',
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    badge: 'Most Popular',
  },
  {
    id: 'advertising',
    icon: Megaphone,
    label: 'Buy Ad Space',
    sublabel: 'Banners, sponsored content & listings',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    id: 'general',
    icon: MessageSquare,
    label: 'General Inquiry',
    sublabel: 'Press, editorial or other questions',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
]

// ─── Static data ──────────────────────────────────────────────────────────────

const trustStats = [
  { icon: Users, value: '1M+', label: 'Monthly readers' },
  { icon: BarChart3, value: '100K+', label: 'Broker comparisons' },
  { icon: TrendingUp, value: '85%', label: 'High-intent traffic' },
  { icon: Globe, value: '15+', label: 'Ad placements' },
]

const trustPoints = [
  { icon: ShieldCheck, text: 'Dedicated partnership manager assigned within 24h' },
  { icon: Clock, text: 'Business inquiries responded to within 2 business hours' },
  { icon: Star, text: 'Trusted by 200+ forex brands globally' },
  { icon: CheckCircle2, text: 'Transparent, no lock-in partnerships' },
]

const budgetOptions = [
  'Under $1,000 / mo',
  '$1,000 – $5,000 / mo',
  '$5,000 – $20,000 / mo',
  '$20,000+ / mo',
  'Prefer to discuss',
]

const adProductOptions = [
  'Featured Broker Listing',
  'Homepage Banner',
  'Newsletter Sponsorship',
  'Sponsored Review / Content',
  'Category Sponsorship',
  'Social Media Exposure',
]

const partnershipTypeOptions = [
  'Co-branded Content',
  'Affiliate Programme',
  'API / Data Partnership',
  'White-label Directory',
  'Event Sponsorship',
  'Other',
]

// ─── Component ────────────────────────────────────────────────────────────────

function ContactUsContent() {
  const searchParams = useSearchParams()
  const [intent, setIntent] = useState<Intent>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // Pre-select intent from ?intent= query param
  useEffect(() => {
    const param = searchParams.get('intent') as Intent
    if (param && intents.some((i) => i.id === param)) {
      setIntent(param)
    }
  }, [searchParams])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1600))
    setSubmitted(true)
    setIsLoading(false)
  }

  const toggleProduct = (p: string) => {
    setSelectedProducts((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  const activeIntent = intents.find((i) => i.id === intent)

  return (
    <div className="bg-background">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right,#ffffff 1px,transparent 1px),linear-gradient(to bottom,#ffffff 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="container relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <Badge className="mb-6 border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              B2B Partnerships
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Let&apos;s Grow Your Forex Brand
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-lg leading-relaxed text-white/60">
              We reach users in the same day. Contact us via this page or email us at <span className="font-semibold text-white">info@bestforex.io</span> for 
              profile claims, partnerships, and advertising opportunities.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 sm:grid-cols-4">
              {trustStats.map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 bg-white/5 px-6 py-5 backdrop-blur-sm"
                >
                  <Icon className="mb-1 h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold text-white">{value}</span>
                  <span className="text-xs text-white/50">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Intent selector ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            What brings you here?
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {intents.map((item) => {
              const Icon = item.icon
              const active = intent === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setIntent(active ? null : item.id)}
                  className={cn(
                    'relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5',
                    active
                      ? cn(item.border, item.bg, 'shadow-md')
                      : 'border-border bg-background hover:border-border hover:bg-muted/40'
                  )}
                  aria-pressed={active}
                >
                  {item.badge && (
                    <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                      active ? cn(item.bg, item.color, 'ring-1', item.border) : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.sublabel}</p>
                  </div>
                  {active && (
                    <CheckCircle2 className={cn('absolute bottom-3 right-3 h-4 w-4', item.color)} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Main: form + sidebar ────────────────────────────────────────────── */}
      <div className="container mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">

          {/* ── Form ─────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            {submitted ? (
              <SuccessState onReset={() => { setSubmitted(false); setSelectedProducts([]) }} />
            ) : (
              <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-8 py-6">
                  <div className="flex items-center gap-3">
                    {activeIntent ? (
                      <>
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', activeIntent.bg)}>
                          <activeIntent.icon className={cn('h-5 w-5', activeIntent.color)} />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-foreground">{activeIntent.label}</h2>
                          <p className="text-xs text-muted-foreground">{activeIntent.sublabel}</p>
                        </div>
                      </>
                    ) : (
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Send us a message</h2>
                        <p className="text-xs text-muted-foreground">
                          Select an inquiry type above for a tailored form, or fill in the details below.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 px-8 py-8">

                  {/* Contact details */}
                  <fieldset>
                    <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Your Details
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField id="firstName" label="First Name" required>
                        <Input id="firstName" name="firstName" placeholder="Jane" required />
                      </FormField>
                      <FormField id="lastName" label="Last Name" required>
                        <Input id="lastName" name="lastName" placeholder="Smith" required />
                      </FormField>
                      <FormField id="email" label="Work Email" required>
                        <Input id="email" name="email" type="email" placeholder="jane@yourbroker.com" required />
                      </FormField>
                      <FormField id="phone" label="Phone / WhatsApp">
                        <Input id="phone" name="phone" type="tel" placeholder="+1 555 000 0000" />
                      </FormField>
                    </div>
                  </fieldset>

                  {/* Company details */}
                  <fieldset>
                    <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Company
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField id="company" label="Company / Brand Name" required>
                        <Input id="company" name="company" placeholder="Acme Broker Ltd." required />
                      </FormField>
                      <FormField id="website" label="Website">
                        <Input id="website" name="website" type="url" placeholder="https://yourbroker.com" />
                      </FormField>
                      <FormField id="role" label="Your Role">
                        <select
                          id="role"
                          name="role"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Select your role</option>
                          <option>CEO / Founder</option>
                          <option>CMO / Marketing Director</option>
                          <option>Marketing Manager</option>
                          <option>Head of Growth</option>
                          <option>PR / Comms</option>
                          <option>Agency / Consultant</option>
                          <option>Other</option>
                        </select>
                      </FormField>
                      <FormField id="country" label="Country">
                        <Input id="country" name="country" placeholder="United Kingdom" />
                      </FormField>
                    </div>
                  </fieldset>

                  {/* Intent-specific: CLAIM */}
                  {intent === 'claim' && (
                    <fieldset>
                      <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Claim Details
                      </legend>
                      <div className="grid gap-4">
                        <FormField id="brokerSlug" label="Your broker / brand URL on BestForex.io">
                          <Input id="brokerSlug" name="brokerSlug" placeholder="https://www.bestforex.io/your-broker" />
                        </FormField>
                        <FormField id="proofType" label="Proof of ownership you can provide">
                          <select
                            id="proofType"
                            name="proofType"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">Select…</option>
                            <option>Email from official domain</option>
                            <option>Regulatory licence document</option>
                            <option>Company registration certificate</option>
                            <option>Other</option>
                          </select>
                        </FormField>
                      </div>
                    </fieldset>
                  )}

                  {/* Intent-specific: ADVERTISING */}
                  {intent === 'advertising' && (
                    <fieldset>
                      <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Advertising Preferences
                      </legend>
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-sm font-medium text-foreground">
                            Products of interest <span className="text-muted-foreground">(select all that apply)</span>
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {adProductOptions.map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => toggleProduct(p)}
                                className={cn(
                                  'rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors',
                                  selectedProducts.includes(p)
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-border bg-background text-foreground hover:bg-muted/50'
                                )}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                          <input type="hidden" name="adProducts" value={selectedProducts.join(', ')} />
                        </div>
                        <FormField id="budget" label="Monthly budget range">
                          <select
                            id="budget"
                            name="budget"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">Select a range…</option>
                            {budgetOptions.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField id="campaignStart" label="Desired campaign start">
                          <select
                            id="campaignStart"
                            name="campaignStart"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">Select…</option>
                            <option>As soon as possible</option>
                            <option>This month</option>
                            <option>Next month</option>
                            <option>This quarter</option>
                            <option>No rush — just exploring</option>
                          </select>
                        </FormField>
                      </div>
                    </fieldset>
                  )}

                  {/* Intent-specific: PARTNERSHIP */}
                  {intent === 'partnership' && (
                    <fieldset>
                      <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Partnership Details
                      </legend>
                      <div className="grid gap-4">
                        <FormField id="partnershipType" label="Type of partnership">
                          <select
                            id="partnershipType"
                            name="partnershipType"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">Select…</option>
                            {partnershipTypeOptions.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField id="audienceSize" label="Your audience / reach (if applicable)">
                          <Input id="audienceSize" name="audienceSize" placeholder="e.g. 50,000 monthly visitors" />
                        </FormField>
                      </div>
                    </fieldset>
                  )}

                  {/* Message */}
                  <fieldset>
                    <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Message
                    </legend>
                    <FormField
                      id="message"
                      label={
                        intent === 'claim'
                          ? 'Additional notes for the verification team'
                          : intent === 'advertising'
                          ? 'Describe your campaign goals'
                          : intent === 'partnership'
                          ? 'Tell us about the collaboration you have in mind'
                          : 'Your message'
                      }
                      required
                    >
                      <Textarea
                        id="message"
                        name="message"
                        required
                        rows={4}
                        placeholder={
                          intent === 'claim'
                            ? 'Any extra context that helps us verify your ownership…'
                            : intent === 'advertising'
                            ? 'Target audience, KPIs, current marketing channels, competitors you want to outrank…'
                            : intent === 'partnership'
                            ? 'What value would both sides get from this partnership?'
                            : 'How can we help?'
                        }
                      />
                    </FormField>
                  </fieldset>

                  {/* Submit */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      size="lg"
                      className="w-full gap-2 bg-primary text-white hover:bg-primary/90"
                    >
                      {isLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Sending…
                        </>
                      ) : (
                        <>
                          {intent === 'claim' && 'Submit Verification Request'}
                          {intent === 'advertising' && 'Request Media Kit & Pricing'}
                          {intent === 'partnership' && 'Send Partnership Proposal'}
                          {(!intent || intent === 'general') && 'Send Message'}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      We respect your privacy. Your details are used solely to respond to this inquiry and are never sold.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <aside className="space-y-6">

            {/* Response SLA */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Response Times</span>
              </div>
              <ul className="space-y-2.5">
                {[
                  ['Claim / Verification', 'Same day response'],
                  ['Advertising inquiry', 'Same day response'],
                  ['Partnership proposal', 'Same day response'],
                  ['General question', 'Same day response'],
                ].map(([type, sla]) => (
                  <li key={type} className="flex items-start justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{type}</span>
                    <span className="whitespace-nowrap font-semibold text-primary">{sla}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust points */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="mb-4 text-sm font-semibold text-foreground">Why partner with us?</p>
              <ul className="space-y-3">
                {trustPoints.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-xs text-muted-foreground">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Direct contacts */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="mb-4 text-sm font-semibold text-foreground">Prefer email?</p>
              <ul className="space-y-3">
                {[
                  { label: 'Partnerships', email: 'partnerships@bestforex.io' },
                  { label: 'Advertising', email: 'ads@bestforex.io' },
                  { label: 'Verification', email: 'verify@bestforex.io' },
                  { label: 'Editorial', email: 'editorial@bestforex.io' },
                ].map(({ label, email }) => (
                  <li key={email} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{label}</p>
                      <a href={`mailto:${email}`} className="text-xs text-primary hover:underline">
                        {email}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Media Kit CTA */}
            <Link
              href="/media-kit"
              className="group flex items-center justify-between rounded-2xl border border-border bg-foreground p-5 transition-colors hover:bg-foreground/90"
            >
              <div>
                <p className="text-sm font-semibold text-background">View our media kit</p>
                <p className="mt-0.5 text-xs text-background/60">Audience data, ad packages & rates</p>
              </div>
              <ChevronRight className="h-5 w-5 text-background/40 transition-transform group-hover:translate-x-0.5" />
            </Link>

          </aside>
        </div>
      </div>

      {/* ── B2B FAQ ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card/60 py-16">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">FAQ</p>
            <h2 className="text-2xl font-bold text-foreground">Common questions from B2B clients</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                q: 'Do you offer exclusivity by broker category?',
                a: 'Yes. We offer category exclusivity on selected placements (e.g. only one ECN broker in the top banner). Ask about availability in your category.',
              },
              {
                q: 'Will a sponsored placement affect my editorial rating?',
                a: 'Never. Commercial relationships are kept strictly separate from our editorial team. Ratings are based solely on our independent methodology.',
              },
              {
                q: 'What reporting do advertisers receive?',
                a: 'Monthly reports covering impressions, clicks, CTR, and referral traffic segmented by device, geography, and page placement.',
              },
              {
                q: 'What is the minimum campaign duration?',
                a: 'Most placements have a 1-month minimum. Partnership packages typically start at 3 months. Custom durations can be arranged.',
              },
              {
                q: 'How long does brand verification take?',
                a: 'Standard verification takes 3–5 business days after you submit proof of ownership. Expedited processing is available for regulated entities.',
              },
              {
                q: 'Can I see performance data before committing?',
                a: 'Yes. We provide a placement-specific media kit with historic traffic data, audience demographics, and comparable advertiser results on request.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-border bg-card p-6">
                <p className="mb-2 text-sm font-semibold text-foreground">{q}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}

export default function ContactUsClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ContactUsContent />
    </Suspense>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({
  id,
  label,
  required,
  children,
}: {
  id: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

function SuccessState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-primary/20 bg-card p-12 text-center shadow-sm">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-foreground">Message received</h3>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Thank you for reaching out. A member of our team will review your inquiry and get back to you
        within the timeframe shown on the right.
      </p>
      <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        Confirmation sent to your email address.
      </div>
      <button
        onClick={onReset}
        className="mt-6 text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        Submit another inquiry
      </button>
    </div>
  )
}
