import type { SectionKey } from '@/lib/content/registry'

export interface Brand {
  id: string
  slug: string
  name: string
  website: string | null
  is_claimed: boolean
  verification_status: 'verified' | 'unverified'
  is_sponsored: boolean
  is_featured: boolean
  claimed_at: string | null
  official_domains: string[]
  portal_locked: boolean
  portal_access: 'active' | 'paused'
  access_notes: string | null
  renewal_date: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'brand_user'
  must_change_password: boolean
}

export type SectionStatus = 'synced' | 'draft' | 'pending_review'

export interface SectionRow {
  id: string
  brand_id: string
  section_key: SectionKey
  draft: Record<string, unknown> | null
  published: Record<string, unknown> | null
  status: SectionStatus
  version: number
  updated_at: string
  published_at: string | null
}

export type OfferStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'expired'
  | 'rejected'
  | 'archived'

export interface Offer {
  id: string
  brand_id: string
  title: string
  subtitle: string | null
  description: string | null
  terms: string
  cta_label: string
  cta_url: string
  starts_at: string | null
  ends_at: string | null
  status: OfferStatus
  sort_order: number
  created_at: string
  updated_at: string
}

export interface MediaAsset {
  id: string
  brand_id: string
  kind: 'logo' | 'screenshot'
  storage_path: string
  public_url: string
  width: number | null
  height: number | null
  bytes: number | null
  alt_text: string | null
  status: 'pending_review' | 'approved' | 'rejected'
  sort_order: number
  created_at: string
}

export interface ModerationItem {
  id: string
  brand_id: string
  target_type: 'section' | 'offer' | 'media'
  target_id: string
  payload: Record<string, unknown>
  auto_flags: { type: 'banned_term' | 'url'; detail: string }[]
  status: 'pending' | 'approved' | 'rejected'
  review_note: string | null
  created_at: string
  reviewed_at: string | null
}

/* Uniform result of every server action. Client code switches on ok and code. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | {
      ok: false
      error: string
      code?:
        | 'validation'
        | 'forbidden'
        | 'not_found'
        | 'version_conflict'
        | 'rate_limited'
        | 'locked'
        | 'paused'
        | 'cap_reached'
        | 'server'
      issues?: { path: string; message: string }[]
      serverVersion?: number
    }
