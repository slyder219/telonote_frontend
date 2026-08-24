interface SelectionHeaderProps {
  total: number
  isSelecting: boolean
  onStartSelecting: () => void
  onCancel: () => void
  allSelected: boolean
  onToggleSelectAll: () => void
}

// The iOS-style entry point into a list's selection mode: an unobtrusive
// "Select" link that, once tapped, swaps in "Select all"/"Cancel" — rather
// than showing a checkbox on every row all the time.
export default function SelectionHeader({
  total,
  isSelecting,
  onStartSelecting,
  onCancel,
  allSelected,
  onToggleSelectAll,
}: SelectionHeaderProps) {
  if (total === 0) return null
  return (
    <div className="flex items-center justify-between px-1">
      {isSelecting ? (
        <>
          <button type="button" onClick={onToggleSelectAll} className="text-sm font-medium text-brand-400">
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <button type="button" onClick={onCancel} className="text-sm font-medium text-ink-soft">
            Cancel
          </button>
        </>
      ) : (
        <button type="button" onClick={onStartSelecting} className="ml-auto text-sm font-medium text-ink-soft">
          Select
        </button>
      )}
    </div>
  )
}
