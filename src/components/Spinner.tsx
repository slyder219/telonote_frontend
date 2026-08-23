export default function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-ink-soft border-t-transparent"
        aria-label="Loading"
      />
    </div>
  )
}
