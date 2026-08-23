import { useEffect, useRef, useState } from 'react'
import { formatDuration, formatTimeOfDay } from './format'
import Button from '../components/Button'
import SwipeableRow from '../components/SwipeableRow'
import AudioScrubber from './AudioScrubber'
import Highlight from '../search/Highlight'
import type { ClientNote } from './types'

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5.5v13l11-6.5-11-6.5z" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
  )
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2m-7 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 15V6a1 1 0 0 1 1-1h9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0 0 14.1 3.4M19.5 9A8 8 0 0 0 5.4 5.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function extensionForBlobType(type: string): string {
  if (type.includes('mp4')) return 'm4a'
  if (type.includes('webm')) return 'webm'
  if (type.includes('ogg')) return 'ogg'
  if (type.includes('mpeg')) return 'mp3'
  if (type.includes('3gpp')) return '3gp'
  if (type.includes('amr')) return 'amr'
  return 'audio'
}

// Buttons rely on real color/background contrast at rest, not just a
// :hover state — hover never fires on a touchscreen, so an icon that's
// only visible on hover is effectively invisible on iOS.
const iconButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink transition-colors active:bg-border'
const playButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors active:bg-brand-100'
const dangerButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink transition-colors active:bg-red-500/15 active:text-red-500'

interface NoteCardProps {
  note: ClientNote
  onEdit?: (id: string, text: string) => void
  onDelete?: (id: string) => void
  onRetryUpload?: (id: string) => void
  onDiscardUpload?: (id: string) => void
  onRequestAudio: (id: string) => Promise<string>
  onRetranscribe?: (id: string) => void
  selected?: boolean
  onToggleSelect?: (id: string) => void
  searchQuery: string
  /** Search-result cards: play/copy/download only — no edit/delete/retranscribe/select, since these may not be part of the loaded notes list the optimistic updates rely on. */
  readOnly?: boolean
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onRetryUpload,
  onDiscardUpload,
  onRequestAudio,
  onRetranscribe,
  selected = false,
  onToggleSelect,
  searchQuery,
  readOnly = false,
}: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(note.finalTranscript ?? '')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [inlineError, setInlineError] = useState('')
  const [justCopied, setJustCopied] = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)
  const [isRetranscribingFlag, setIsRetranscribingFlag] = useState(false)
  const [prevStatus, setPrevStatus] = useState(note.status)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingAutoPlay = useRef(false)

  const duration = formatDuration(note.durationMs)
  const transcript = note.finalTranscript ?? note.roughTranscript
  const hasRealId = note.status === 'ready' || note.status === 'processing'
  const canPlay = hasRealId || Boolean(note.localAudioUrl)
  // Retranscribing an already-transcribed note reuses the 'processing'
  // status too, but here there's old text still on screen — treat that
  // case as "updating this text" rather than the empty "no transcript yet".
  const isRetranscribingNow = note.status === 'processing' && transcript !== null && isRetranscribingFlag

  // A retranscribe we triggered just landed (status left 'processing') —
  // flash the transcript so the replacement is visibly obvious rather than
  // a silent text swap. Comparing against the note's own status as it
  // changes, adjusted during render, per React's "adjusting state when a
  // prop changes" pattern — avoids an extra render pass through an effect.
  if (note.status !== prevStatus) {
    setPrevStatus(note.status)
    if (isRetranscribingFlag && prevStatus === 'processing' && note.status !== 'processing') {
      setIsRetranscribingFlag(false)
      setJustUpdated(true)
    }
  }

  // Audio fetched from the server lands on `note.localAudioUrl` after
  // onRequestAudio resolves and the parent re-renders — once that happens,
  // actually start playback rather than just leaving it preloaded.
  useEffect(() => {
    if (pendingAutoPlay.current && note.localAudioUrl && audioRef.current) {
      pendingAutoPlay.current = false
      audioRef.current.play()
    }
  }, [note.localAudioUrl])

  // Timer-only effect: auto-clear the flash a bit after it's triggered above.
  useEffect(() => {
    if (!justUpdated) return
    const timer = setTimeout(() => setJustUpdated(false), 1500)
    return () => clearTimeout(timer)
  }, [justUpdated])

  const startEdit = () => {
    setDraft(note.finalTranscript ?? '')
    setIsEditing(true)
  }

  const saveEdit = () => {
    setIsEditing(false)
    if (draft !== note.finalTranscript) onEdit?.(note.id, draft)
  }

  const togglePlay = async () => {
    if (note.localAudioUrl) {
      const audio = audioRef.current
      if (!audio) return
      if (isPlaying) audio.pause()
      else audio.play()
      return
    }

    setInlineError('')
    setIsLoadingAudio(true)
    pendingAutoPlay.current = true
    try {
      await onRequestAudio(note.id)
    } catch {
      pendingAutoPlay.current = false
      setInlineError("Couldn't load audio.")
    } finally {
      setIsLoadingAudio(false)
    }
  }

  const handleDelete = () => {
    if (window.confirm("Delete this note? This can't be undone.")) onDelete?.(note.id)
  }

  const handleCopy = async () => {
    if (!transcript) return
    try {
      await navigator.clipboard.writeText(transcript)
      setJustCopied(true)
      setTimeout(() => setJustCopied(false), 1500)
    } catch {
      setInlineError("Couldn't copy to clipboard.")
      setTimeout(() => setInlineError(''), 3000)
    }
  }

  const handleRetranscribe = () => {
    setIsRetranscribingFlag(true)
    onRetranscribe?.(note.id)
  }

  const handleDownload = async () => {
    setInlineError('')
    setIsDownloading(true)
    try {
      const url = note.localAudioUrl ?? (await onRequestAudio(note.id))
      // Peeking at the blob's real type (a local, instant read for a blob:
      // URL) gives a sensible file extension instead of a generic one.
      const blob = await fetch(url).then((r) => r.blob())
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `telonote-${note.createdAt.slice(0, 10)}.${extensionForBlobType(blob.type)}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch {
      setInlineError("Couldn't download audio.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <SwipeableRow
      onDelete={!readOnly && hasRealId ? handleDelete : undefined}
      onEdit={!readOnly && hasRealId ? startEdit : undefined}
    >
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
            {!readOnly && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect?.(note.id)}
                aria-label="Select note"
                className="mr-1 h-4 w-4 shrink-0 accent-brand-500"
              />
            )}
            <span className="shrink-0" title={new Date(note.createdAt).toLocaleString()}>
              {formatTimeOfDay(note.createdAt)}
            </span>
            {duration && (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{duration}</span>
              </>
            )}
            {note.status === 'uploading' && (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-brand-600">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                Sending…
              </span>
            )}
            {note.status === 'processing' && (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-brand-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
                Transcribing…
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {canPlay && (
              <button
                type="button"
                onClick={togglePlay}
                disabled={isLoadingAudio}
                aria-label={isPlaying ? 'Pause' : 'Play recording'}
                className={playButtonClass}
              >
                {isLoadingAudio ? <SpinnerIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
            )}
            {hasRealId && transcript && (
              <button type="button" onClick={handleCopy} aria-label="Copy transcript" className={iconButtonClass}>
                {justCopied ? <CheckIcon /> : <CopyIcon />}
              </button>
            )}
            {hasRealId && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                aria-label="Download audio"
                className={iconButtonClass}
              >
                {isDownloading ? <SpinnerIcon /> : <DownloadIcon />}
              </button>
            )}
            {!readOnly && hasRealId && (
              <button
                type="button"
                onClick={handleRetranscribe}
                aria-label="Re-run transcription"
                className={iconButtonClass}
              >
                <RefreshIcon />
              </button>
            )}
            {!readOnly && hasRealId && (
              <button type="button" onClick={startEdit} aria-label="Edit transcript" className={iconButtonClass}>
                <PencilIcon />
              </button>
            )}
            {!readOnly && hasRealId && (
              <button type="button" onClick={handleDelete} aria-label="Delete note" className={dangerButtonClass}>
                <TrashIcon />
              </button>
            )}
          </div>
        </div>

        {inlineError && <p className="mt-1 text-right text-xs text-red-500">{inlineError}</p>}

        {note.localAudioUrl && (
          <>
            <audio
              ref={audioRef}
              src={note.localAudioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <AudioScrubber audioRef={audioRef} />
          </>
        )}

        <div className="mt-3">
          {note.status === 'upload-error' ? (
            <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
              <p>{note.uploadError ?? 'Upload failed.'}</p>
              <div className="mt-3 flex gap-3">
                <Button
                  type="button"
                  variant="primary"
                  className="!px-4 !py-2 !text-sm"
                  onClick={() => onRetryUpload?.(note.id)}
                >
                  Retry
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-4 !py-2 !text-sm"
                  onClick={() => onDiscardUpload?.(note.id)}
                >
                  Discard
                </Button>
              </div>
            </div>
          ) : isEditing ? (
            <div className="flex flex-col gap-3">
              <textarea
                className="min-h-24 w-full rounded-xl border border-border bg-paper p-3 text-[16px] text-ink outline-none focus:border-brand-400"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-4 !py-2 !text-sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="button" variant="primary" className="!px-4 !py-2 !text-sm" onClick={saveEdit}>
                  Save
                </Button>
              </div>
            </div>
          ) : transcript ? (
            <div>
              {isRetranscribingNow && (
                <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs text-brand-600">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                  Re-transcribing…
                </p>
              )}
              <p
                className={`whitespace-pre-wrap rounded-lg text-[15px] leading-relaxed text-ink transition-colors duration-700 ${
                  isRetranscribingNow ? 'opacity-50' : ''
                } ${justUpdated ? 'bg-brand-50' : 'bg-transparent'}`}
              >
                <Highlight text={transcript} query={searchQuery} />
              </p>
            </div>
          ) : note.status === 'uploading' || note.status === 'processing' ? (
            <p className="text-sm italic text-ink-soft">Transcribing your note…</p>
          ) : (
            <p className="text-sm italic text-ink-soft">No transcript yet.</p>
          )}
          {note.isSavingEdit && <p className="mt-2 text-xs text-ink-soft">Saving…</p>}
        </div>
      </div>
    </SwipeableRow>
  )
}
