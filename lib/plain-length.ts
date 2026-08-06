/**
 * Dependency-free plain-text length used by both the zod schema builder
 * (which runs on the client via zodResolver) and server sanitizing. Kept out
 * of lib/sanitize so importing it never pulls the node-only sanitize-html
 * package into the client bundle.
 */
export function plainLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, '') // strip tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim().length
}
