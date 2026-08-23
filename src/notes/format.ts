export function formatDuration(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined) return null
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatTimeOfDay(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** A stable per-calendar-day key (local time) for grouping. */
export function dayKey(isoDate: string): string {
  const d = startOfDay(new Date(isoDate))
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** "Today" / "Yesterday" / a full date — for a day-group header. */
export function dayLabel(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString(undefined, {
    weekday: diffDays < 7 ? 'long' : undefined,
    month: 'long',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}

export function formatResetTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

export function filenameForMimeType(mimeType: string): string {
  return `note.${extensionForMimeType(mimeType)}`
}
