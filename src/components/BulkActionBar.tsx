import type { ReactNode } from 'react'

interface BulkActionBarProps {
  count: number
  onClear: () => void
  children: ReactNode
}

export default function BulkActionBar({ count, onClear, children }: BulkActionBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-brand-700">{count} selected</span>
        <button type="button" onClick={onClear} className="text-sm text-brand-600 underline">
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
