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

/**
 * Recorder and transcoded blobs have no real filename to fall back on, so
 * their extension has to be derived from the mime type — that's what
 * filenameForMimeType is for. A file picked from disk already has a real
 * name (and therefore a real, trustworthy extension); deriving one from its
 * mime type instead can silently mislabel it — e.g. a real .m4a commonly
 * reports as audio/x-m4a, which doesn't match any known mime type and used
 * to fall through to a hardcoded "webm" extension, corrupting the upload.
 */
export function filenameForUpload(blob: Blob, mimeType: string): string {
  if (blob instanceof File && blob.name) return blob.name
  return filenameForMimeType(mimeType)
}

export interface ExportRecord {
  id: string
  createdAt: string
  durationMs: number | null
  transcript: string | null
}

export type ExportFormat = 'txt' | 'csv' | 'json'

const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
}

function csvCell(value: string): string {
  // Quote whenever the raw value could otherwise be misread as multiple
  // cells or run past a line boundary; doubling embedded quotes is the
  // standard CSV escape.
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Formats a batch of notes for export/download in the given format — newest-first order is the caller's responsibility. */
export function formatNotesForExport(records: ExportRecord[], format: ExportFormat): string {
  if (format === 'json') {
    return JSON.stringify(
      records.map((r) => ({
        id: r.id,
        created_at: r.createdAt,
        duration_ms: r.durationMs,
        transcript: r.transcript,
      })),
      null,
      2,
    )
  }
  if (format === 'csv') {
    const rows = records.map((r) =>
      [r.id, r.createdAt, r.durationMs ?? '', r.transcript ?? '']
        .map((value) => csvCell(String(value)))
        .join(','),
    )
    return ['id,created_at,duration_ms,transcript', ...rows].join('\n')
  }
  // Plain text — same shape as the bulk "Copy" action, one note per section.
  return records
    .map((r) => `${new Date(r.createdAt).toLocaleString()}\n${r.transcript ?? '(no transcript)'}`)
    .join('\n\n---\n\n')
}

export function exportFilename(format: ExportFormat): string {
  return `telonote-export-${new Date().toISOString().slice(0, 10)}.${format}`
}

export function downloadTextFile(filename: string, text: string, format: ExportFormat = 'txt') {
  const blob = new Blob([text], { type: EXPORT_MIME_TYPES[format] })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoking synchronously, right after click(), can race the browser's own
  // handling of the blob: URL and silently drop the download in some
  // builds — give it a beat first.
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
