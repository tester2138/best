'use client'

import { useState } from 'react'
import { Controller, type Control } from 'react-hook-form'
import { X, Plus, GripVertical } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { FieldDef } from '@/lib/content/registry'
import { RichText } from './rich-text'

/** Client-side plain-text length (mirrors lib/sanitize.plainLength without pulling in sanitize-html). */
function plainLen(html: string): number {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '').length
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim().length
}

function LimitCounter({ current, max }: { current: number; max: number }) {
  const ratio = current / max
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        ratio > 0.9 ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {current} / {max}
    </span>
  )
}

interface FieldControlProps {
  field: FieldDef
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  error?: string
}

export function FieldControl({ field, control, error }: FieldControlProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={field.key} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      </div>

      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => <Widget def={field} value={f.value} onChange={f.onChange} onBlur={f.onBlur} invalid={!!error} />}
      />

      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

function Widget({
  def,
  value,
  onChange,
  onBlur,
  invalid,
}: {
  def: FieldDef
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: any) => void
  onBlur?: () => void
  invalid?: boolean
}) {
  switch (def.widget) {
    case 'text':
    case 'url':
    case 'email':
    case 'tel': {
      const v = (value as string) ?? ''
      const type = def.widget === 'email' ? 'email' : def.widget === 'tel' ? 'tel' : 'text'
      return (
        <div className="flex flex-col gap-1">
          <Input
            id={def.key}
            type={type}
            value={v}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            aria-invalid={invalid}
            className={cn(invalid && 'border-destructive')}
          />
          {def.max && (
            <div className="flex justify-end">
              <LimitCounter current={v.length} max={def.max} />
            </div>
          )}
        </div>
      )
    }

    case 'textarea': {
      const v = (value as string) ?? ''
      return (
        <div className="flex flex-col gap-1">
          <Textarea
            id={def.key}
            rows={4}
            value={v}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            aria-invalid={invalid}
            className={cn(invalid && 'border-destructive')}
          />
          {def.max && (
            <div className="flex justify-end">
              <LimitCounter current={v.length} max={def.max} />
            </div>
          )}
        </div>
      )
    }

    case 'rich': {
      const v = (value as string) ?? ''
      return (
        <div className="flex flex-col gap-1">
          <RichText value={v} onChange={onChange} onBlur={onBlur} invalid={invalid} />
          {def.max && (
            <div className="flex justify-end">
              <LimitCounter current={plainLen(v)} max={def.max} />
            </div>
          )}
        </div>
      )
    }

    case 'int':
    case 'year': {
      return (
        <Input
          id={def.key}
          type="number"
          inputMode="numeric"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          onBlur={onBlur}
          min={def.intMin}
          max={def.intMax}
          aria-invalid={invalid}
          className={cn('max-w-40', invalid && 'border-destructive')}
        />
      )
    }

    case 'boolean': {
      return (
        <div className="flex h-9 items-center">
          <Switch id={def.key} checked={!!value} onCheckedChange={onChange} />
        </div>
      )
    }

    case 'select': {
      return (
        <Select value={(value as string) ?? ''} onValueChange={onChange}>
          <SelectTrigger id={def.key} className={cn('max-w-xs', invalid && 'border-destructive')}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(def.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    case 'multiselect': {
      const arr: string[] = Array.isArray(value) ? value : []
      const toggle = (o: string) =>
        onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(def.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <Checkbox checked={arr.includes(o)} onCheckedChange={() => toggle(o)} />
              {o}
            </label>
          ))}
        </div>
      )
    }

    case 'stringList':
      return <StringListWidget def={def} value={value} onChange={onChange} invalid={invalid} />

    case 'objectList':
      return <ObjectListWidget def={def} value={value} onChange={onChange} />

    default:
      return null
  }
}

function StringListWidget({
  def,
  value,
  onChange,
  invalid,
}: {
  def: FieldDef
  value: unknown
  onChange: (v: string[]) => void
  invalid?: boolean
}) {
  const items: string[] = Array.isArray(value) ? value : []
  const [draft, setDraft] = useState('')
  const max = def.maxItems ?? 20
  const canAdd = draft.trim().length > 0 && items.length < max

  const add = () => {
    if (!canAdd) return
    onChange([...items, draft.trim().slice(0, def.itemMax ?? 120)])
    setDraft('')
  }
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <div className="flex flex-col">
              <button
                type="button"
                aria-label="Move up"
                onClick={() => move(i, -1)}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                disabled={i === 0}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="flex-1">{it}</span>
            <button
              type="button"
              aria-label={`Remove ${it}`}
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      {items.length < max && (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                add()
              }
            }}
            placeholder={`Add ${def.label.toLowerCase()}`}
            maxLength={def.itemMax ?? 120}
            aria-invalid={invalid}
          />
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      )}
      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground">
          {items.length} / {max}
        </span>
      </div>
    </div>
  )
}

function ObjectListWidget({
  def,
  value,
  onChange,
}: {
  def: FieldDef
  value: unknown
  onChange: (v: Record<string, unknown>[]) => void
}) {
  const items: Record<string, unknown>[] = Array.isArray(value) ? value : []
  const max = def.maxItems ?? 10
  const children = def.fields ?? []

  const addItem = () => {
    if (items.length >= max) return
    onChange([...items, {}])
  }
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const patch = (i: number, key: string, v: unknown) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it))
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {def.label} {i + 1}
            </span>
            <button
              type="button"
              aria-label="Remove item"
              onClick={() => removeItem(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {children.map((child) => (
              <div key={child.key} className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">
                  {child.label}
                  {child.required && <span className="ml-0.5 text-destructive">*</span>}
                </Label>
                <Widget
                  def={child}
                  value={it[child.key]}
                  onChange={(v) => patch(i, child.key, v)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <Plus className="h-4 w-4" /> Add {def.label.toLowerCase()}
        </button>
      )}
    </div>
  )
}
