import sanitizeHtml from 'sanitize-html'

export { plainLength } from './plain-length'

/**
 * Rich-text sanitizer (Blueprint Section 9.2).
 * The allow-list is intentionally tiny: only inline emphasis and lists.
 * Everything else (scripts, styles, iframes, attributes) is discarded.
 */
export function sanitizeRich(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  })
}

/** Strip all tags, leaving plain text. */
export function stripToPlain(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
}
