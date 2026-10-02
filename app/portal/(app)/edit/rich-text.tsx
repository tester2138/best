'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Minimal rich-text editor (Blueprint Section 14.1): bold, italic, bullet and
 * ordered lists only. Emits sanitized-ready HTML upward; the server re-sanitizes
 * on save/publish so the client output is never trusted.
 */
export function RichText({
  value,
  onChange,
  onBlur,
  invalid,
  readOnly = false,
}: {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  invalid?: boolean
  readOnly?: boolean
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        strike: false,
      }),
    ],
    editable: !readOnly,
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none min-h-32 rounded-md border bg-background px-3 py-2',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          invalid && 'border-destructive',
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
  })

  // Keep editor content in sync when the form resets (e.g. reload server copy).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [editor, readOnly])

  if (!editor) return null

  const Btn = ({
    active,
    onClick,
    label,
    children,
  }: {
    active: boolean
    onClick: () => void
    label: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted',
        active && 'bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-1">
        <Btn
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Btn>
        <Btn
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Btn>
        <Btn
          label="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Btn>
        <Btn
          label="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Btn>
      </div>}
      <EditorContent editor={editor} />
    </div>
  )
}
