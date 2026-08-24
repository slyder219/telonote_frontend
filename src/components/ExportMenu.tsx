import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ExportFormat } from '../notes/format'

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void
  disabled?: boolean
  triggerClassName: string
  children: ReactNode
}

const FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'txt', label: 'Text (.txt)' },
  { format: 'csv', label: 'CSV (.csv)' },
  { format: 'json', label: 'JSON (.json)' },
]

// A small format-choice popover for the export actions — safe to use as a
// plain dropdown here (unlike NoteCard's per-row actions) since nothing on
// this page clips overflow the way SwipeableRow's card wrapper does.
export default function ExportMenu({ onExport, disabled, triggerClassName, children }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const choose = (format: ExportFormat) => {
    setIsOpen(false)
    onExport(format)
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={triggerClassName}
      >
        {children}
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 min-w-36 overflow-hidden rounded-xl border border-border bg-surface py-1 text-left shadow-lg">
          {FORMATS.map(({ format, label }) => (
            <button
              key={format}
              type="button"
              onClick={() => choose(format)}
              className="block w-full px-4 py-2 text-left text-sm text-ink active:bg-paper"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
