interface BannerProps {
  message: string
  onDismiss: () => void
}

export default function Banner({ message, onDismiss }: BannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink shadow-sm">
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-ink-soft hover:text-ink"
      >
        ✕
      </button>
    </div>
  )
}
