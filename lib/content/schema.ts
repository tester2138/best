import { z } from 'zod'
import { type FieldDef, type SectionDef, SECTIONS, type SectionKey } from './registry'
import { plainLength } from '@/lib/plain-length'

/**
 * Zod schema builder (Blueprint Section 9.1).
 * Every section's validation schema is derived from the registry — no schema
 * is hand-written per section. Unknown keys are rejected and never stored.
 */

const E164 = /^\+[1-9]\d{6,14}$/

function baseFor(f: FieldDef): z.ZodTypeAny {
  switch (f.widget) {
    case 'text':
    case 'textarea': {
      let str = z.string().trim().max(f.max ?? 200)
      if (f.min) str = str.min(f.min)
      if (f.widget === 'text')
        return str.refine((v) => !v.includes('\n'), 'No line breaks')
      return str.refine((v) => (v.match(/\n/g) ?? []).length <= 3, 'Max 3 line breaks')
    }
    case 'rich':
      return z
        .string()
        .max((f.max ?? 3000) * 8) /* raw HTML sanity cap */
        .refine((v) => plainLength(v) <= (f.max ?? 3000), `Max ${f.max} characters`)
        .refine((v) => plainLength(v) >= (f.min ?? 0), `Min ${f.min ?? 0} characters`)
    case 'int':
      return z.coerce.number().int().min(f.intMin ?? 0).max(f.intMax ?? 1000000000)
    case 'year':
      return z.coerce.number().int().min(f.intMin ?? 1900).max(new Date().getFullYear())
    case 'boolean':
      return z.coerce.boolean()
    case 'select':
      return z.enum(f.options as [string, ...string[]])
    case 'multiselect':
      return z.array(z.enum(f.options as [string, ...string[]])).max(f.options!.length)
    case 'stringList':
      return z
        .array(z.string().trim().min(1).max(f.itemMax ?? 100))
        .min(f.minItems ?? 0)
        .max(f.maxItems ?? 20)
    case 'objectList': {
      const shape: Record<string, z.ZodTypeAny> = {}
      for (const c of f.fields ?? []) shape[c.key] = wrap(c, baseFor(c))
      return z.array(z.object(shape).strict()).min(f.minItems ?? 0).max(f.maxItems ?? 10)
    }
    case 'url':
      return z
        .string()
        .trim()
        .url()
        .max(2048)
        .refine((v) => v.startsWith('https://'), 'https only')
    case 'email':
      return z.string().trim().email().max(120)
    case 'tel':
      return z.string().trim().regex(E164, 'Use E.164 format, like +442071234567')
    default:
      return z.any()
  }
}

function wrap(f: FieldDef, s: z.ZodTypeAny): z.ZodTypeAny {
  if (f.required) return s
  /* optional fields accept empty string / empty array and normalise to undefined */
  return z.preprocess(
    (v) => (v === '' || (Array.isArray(v) && v.length === 0) ? undefined : v),
    s.optional(),
  )
}

export function zodFor(key: SectionKey) {
  const def: SectionDef = SECTIONS[key]
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of def.fields) shape[f.key] = wrap(f, baseFor(f))
  return z.object(shape).strict() /* unknown keys are rejected, never stored */
}
