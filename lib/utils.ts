import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * T20: Compute article read time from word count.
 * Uses 200 wpm average reading speed, minimum 1 minute.
 * Returns a display string, e.g. "4 min read".
 */
export function readMinutes(wordCount: number): string {
  const minutes = Math.max(1, Math.ceil(wordCount / 200))
  return `${minutes} min read`
}
