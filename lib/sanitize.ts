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

export function sanitizeEditorialHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'dd', 'del',
      'details', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3',
      'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'q', 's',
      'section', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody',
      'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'role', 'aria-label', 'aria-labelledby'],
      a: ['href', 'name', 'target', 'rel', 'title'],
      img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
      td: ['colspan', 'rowspan', 'headers'],
      th: ['colspan', 'rowspan', 'headers', 'scope'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  })
}

/** Strip all tags, leaving plain text. */
export function stripToPlain(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
}
