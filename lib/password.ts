import 'server-only'
import { randomInt } from 'node:crypto'

/**
 * Generate a cryptographically-strong temporary password (Blueprint Section 11).
 * Used when an admin provisions or re-issues a broker account. The broker is
 * forced to change it on first login (must_change_password).
 *
 * Character set excludes ambiguous glyphs (0/O, 1/l/I) so the password can be
 * read from an email without confusion. Guarantees at least one lowercase,
 * uppercase, digit and symbol.
 */
const LOWER = 'abcdefghijkmnpqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%^&*-_=+'
const ALL = LOWER + UPPER + DIGITS + SYMBOLS

export function generatePassword(length = 20): string {
  const len = Math.max(12, length)
  const required = [
    LOWER[randomInt(LOWER.length)],
    UPPER[randomInt(UPPER.length)],
    DIGITS[randomInt(DIGITS.length)],
    SYMBOLS[randomInt(SYMBOLS.length)],
  ]
  const rest: string[] = []
  for (let i = required.length; i < len; i++) {
    rest.push(ALL[randomInt(ALL.length)])
  }
  const chars = [...required, ...rest]
  // Fisher–Yates shuffle so the required chars are not always in front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
