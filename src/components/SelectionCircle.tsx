interface SelectionCircleProps {
  selected: boolean
  onToggle: () => void
  label: string
}

// The iOS list-selection affordance: an empty ring that fills solid with a
// checkmark once selected, instead of a browser-native checkbox. Used both
// for bulk-select mode and, generically, anywhere else a single boolean
// needs this exact tap-to-toggle idiom (e.g. a note's completed flag).
export default function SelectionCircle({ selected, onToggle, label }: SelectionCircleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={label}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        selected ? 'border-brand-500 bg-brand-500' : 'border-border bg-transparent'
      }`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={selected ? 'text-white' : 'text-transparent'}
      >
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
