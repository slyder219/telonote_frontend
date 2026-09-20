import type { ReactNode } from 'react'
import type { ExportFormat } from '../notes/format'
import ActionMenu from './ActionMenu'

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void
  disabled?: boolean
  triggerClassName: string
  children: ReactNode
}

const FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'txt', label: 'Text (.txt)' },
  { format: 'md', label: 'Markdown (.md)' },
  { format: 'enex', label: 'Apple Notes (.enex)' },
  { format: 'csv', label: 'CSV (.csv)' },
  { format: 'json', label: 'JSON (.json)' },
]

// The format picker for the export actions — the shared iOS-style menu, so it
// gets keyboard navigation, Escape/outside-tap dismissal and screen-reader
// roles for free.
export default function ExportMenu({ onExport, disabled, triggerClassName, children }: ExportMenuProps) {
  return (
    <ActionMenu
      label="Export format"
      align="start"
      items={FORMATS.map(({ format, label }) => ({ key: format, label, onSelect: () => onExport(format) }))}
      renderTrigger={(triggerProps) => (
        <button type="button" disabled={disabled} className={triggerClassName} {...triggerProps}>
          {children}
        </button>
      )}
    />
  )
}
