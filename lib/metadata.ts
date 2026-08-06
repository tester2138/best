/**
 * lib/metadata.ts — Shared metadata helpers (T16).
 *
 * Rule: twitter card values ALWAYS mirror the page's og values.
 * Use buildPageMeta() instead of hand-rolling twitter fields per-page.
 */
import type { Metadata } from 'next'
import { SITE_OG_IMAGE } from '@/lib/site'

interface PageMetaInput {
  title: string
  description: string
  canonical: string
  image?: string
  imageAlt?: string
  ogType?: 'website' | 'article'
}

/**
 * Build a Metadata object whose twitter.* fields are guaranteed to mirror og.*
 * Callers may spread the result and override specific fields as needed.
 */
export function buildPageMeta({
  title,
  description,
  canonical,
  image = SITE_OG_IMAGE,
  imageAlt = title,
  ogType = 'website',
}: PageMetaInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: ogType,
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}
