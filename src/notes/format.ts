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
  /** Only used by the checklist format, where it pre-ticks the item. */
  completed?: boolean
}

export type ExportFormat = 'txt' | 'md' | 'enex' | 'enex-checklist' | 'csv' | 'json'

const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  enex: 'application/xml',
  'enex-checklist': 'application/xml',
  csv: 'text/csv',
  json: 'application/json',
}

function csvCell(value: string): string {
  // Quote whenever the raw value could otherwise be misread as multiple
  // cells or run past a line boundary; doubling embedded quotes is the
  // standard CSV escape.
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function escapeXml(value: string): string {
  return (
    value
      // XML 1.0 forbids most control characters outright, even escaped — a
      // single stray one would make the whole file unimportable.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  )
}

// ENEX timestamps are UTC, compact ISO-8601: 20260920T150000Z.
function enexTimestamp(isoDate: string): string {
  return new Date(isoDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function enexNote(title: string, bodyHtml: string, isoDate: string): string {
  const stamp = enexTimestamp(isoDate)
  // Escaping ">" above means the content can never contain "]]>", so the
  // CDATA wrapper can't be terminated early by a transcript.
  const enml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">' +
    `<en-note>${bodyHtml}</en-note>`
  return (
    `<note><title>${escapeXml(title)}</title>` +
    `<content><![CDATA[${enml}]]></content>` +
    `<created>${stamp}</created><updated>${stamp}</updated></note>`
  )
}

function enexExport(notes: string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">',
    `<en-export export-date="${enexTimestamp(new Date().toISOString())}" application="Telonote" version="1">`,
    ...notes,
    '</en-export>',
  ].join('\n')
}

/**
 * Evernote's export format (.enex) — importable by Apple Notes on a Mac
 * (File > Import to Notes), which carries each note's created date along,
 * unlike a plain .txt/.md import. Text-only: no attachments/resources.
 */
function formatAsEnex(records: ExportRecord[]): string {
  return enexExport(
    records.map((r) => {
      const lines = (r.transcript ?? '(no transcript)').split(/\r?\n/)
      const body = lines.map((line) => `<div>${line ? escapeXml(line) : '<br/>'}</div>`).join('')
      return enexNote(new Date(r.createdAt).toLocaleString(), body, r.createdAt)
    }),
  )
}

/**
 * Same .enex import path, but each calendar day becomes one note whose lines
 * are checkable items ("<en-todo/>" is ENML's checkbox) — time first, then the
 * transcript flattened onto one line. Completed notes arrive pre-ticked.
 */
function formatAsEnexChecklist(records: ExportRecord[]): string {
  const days = new Map<string, ExportRecord[]>()
  for (const r of records) {
    const key = dayKey(r.createdAt)
    days.set(key, [...(days.get(key) ?? []), r])
  }
  return enexExport(
    [...days.values()].map((group) => {
      const body = group
        .map((r) => {
          const text = (r.transcript ?? '(no transcript)').replace(/\s+/g, ' ').trim()
          const checked = r.completed ? 'true' : 'false'
          return `<div><en-todo checked="${checked}"/>${escapeXml(`${formatTimeOfDay(r.createdAt)} — ${text}`)}</div>`
        })
        .join('')
      const title = new Date(group[0].createdAt).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      return enexNote(title, body, group[0].createdAt)
    }),
  )
}

/** Formats a batch of notes for export/download in the given format — newest-first order is the caller's responsibility. */
export function formatNotesForExport(records: ExportRecord[], format: ExportFormat): string {
  if (format === 'enex') return formatAsEnex(records)
  if (format === 'enex-checklist') return formatAsEnexChecklist(records)
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
  if (format === 'md') {
    // One heading per note, so an importer that converts Markdown to rich
    // text (e.g. Apple Notes on iOS/macOS 26+) renders each note's date as
    // a title above its transcript.
    return records
      .map((r) => `# ${new Date(r.createdAt).toLocaleString()}\n\n${r.transcript ?? '(no transcript)'}`)
      .join('\n\n---\n\n')
  }
  // Plain text — same shape as the bulk "Copy" action, one note per section.
  return records
    .map((r) => `${new Date(r.createdAt).toLocaleString()}\n${r.transcript ?? '(no transcript)'}`)
    .join('\n\n---\n\n')
}

export function exportFilename(format: ExportFormat): string {
  const extension = format === 'enex-checklist' ? 'enex' : format
  const suffix = format === 'enex-checklist' ? '-checklist' : ''
  return `telonote-export-${new Date().toISOString().slice(0, 10)}${suffix}.${extension}`
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
