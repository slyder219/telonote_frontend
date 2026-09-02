import { NOTE_COLORS } from '../api/notes'
import type { NoteColor } from '../api/notes'

// A literal class-per-color map, not a template-built string — Tailwind's
// build-time scanner only picks up statically-visible class names, so
// `bg-${color}-500` would silently get purged from the production build.
const SWATCH_FILL_CLASSES: Record<NoteColor, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
}

interface ColorSwatchPickerProps {
  value: NoteColor | null
  onChange: (color: NoteColor | null) => void
}

export default function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Note color">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="No color"
        aria-pressed={value === null}
        className={`h-7 w-7 shrink-0 rounded-full border-2 bg-paper transition-colors ${
          value === null ? 'border-brand-500' : 'border-border'
        }`}
      />
      {NOTE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(value === color ? null : color)}
          aria-label={`${color} color`}
          aria-pressed={value === color}
          className={`h-7 w-7 shrink-0 rounded-full border-2 transition-colors ${SWATCH_FILL_CLASSES[color]} ${
            value === color ? 'border-ink' : 'border-transparent'
          }`}
        />
      ))}
    </div>
  )
}
