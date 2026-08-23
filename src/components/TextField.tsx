import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export default function TextField({ label, error, id, className = '', ...props }: TextFieldProps) {
  return (
    <label htmlFor={id} className="block text-left">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        id={id}
        className={`w-full rounded-xl border bg-surface px-4 py-3 text-[16px] text-ink outline-none transition-colors placeholder:text-ink-soft/60 ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-border focus:border-brand-400'
        } ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <span className="mt-1.5 block text-sm text-red-500">{error}</span>}
    </label>
  )
}
