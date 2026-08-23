import { useEffect, useRef, useState } from 'react'
import { formatDuration, formatRelativeTime } from './format'
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
  onEdit: (id: string, text: string) => void
  onDelete: (id: string) => void
  onRetryUpload: (id: string) => void
  onDiscardUpload: (id: string) => void
  onRequestAudio: (id: string) => Promise<string>
  onRetranscribe: (id: string) => void
  selected: boolean
  onToggleSelect: (id: string) => void
  searchQuery: string
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onRetryUpload,
  onDiscardUpload,
  onRequestAudio,
  onRetranscribe,
  selected,
  onToggleSelect,
  searchQuery,
}: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(note.finalTranscript ?? '')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [inlineError, setInlineError] = useState('')
  const [justCopied, setJustCopied] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingAutoPlay = useRef(false)

  const duration = formatDuration(note.durationMs)
  const transcript = note.finalTranscript ?? note.roughTranscript
  const hasRealId = note.status === 'ready' || note.status === 'processing'
  const canPlay = hasRealId || Boolean(note.localAudioUrl)

  // Audio fetched from the server lands on `note.localAudioUrl` after
  // onRequestAudio resolves and the parent re-renders — once that happens,
  // actually start playback rather than just leaving it preloaded.
  useEffect(() => {
    if (pendingAutoPlay.current && note.localAudioUrl && audioRef.current) {
      pendingAutoPlay.current = false
      audioRef.current.play()
    }
  }, [note.localAudioUrl])

  const startEdit = () => {
    setDraft(note.finalTranscript ?? '')
    setIsEditing(true)
  }

  const saveEdit = () => {
    setIsEditing(false)
    if (draft !== note.finalTranscript) onEdit(note.id, draft)
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
    if (window.confirm("Delete this note? This can't be undone.")) onDelete(note.id)
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

  return (
    <SwipeableRow onDelete={hasRealId ? handleDelete : undefined} onEdit={hasRealId ? startEdit : undefined}>
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(note.id)}
              aria-label="Select note"
              className="mr-1 h-4 w-4 shrink-0 accent-brand-500"
            />
            <span className="shrink-0">{formatRelativeTime(note.createdAt)}</span>
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
                onClick={() => onRetranscribe(note.id)}
                aria-label="Re-run transcription"
                className={iconButtonClass}
              >
                <RefreshIcon />
              </button>
            )}
            {hasRealId && (
              <button type="button" onClick={startEdit} aria-label="Edit transcript" className={iconButtonClass}>
                <PencilIcon />
              </button>
            )}
            {hasRealId && (
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
                  onClick={() => onRetryUpload(note.id)}
                >
                  Retry
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-4 !py-2 !text-sm"
                  onClick={() => onDiscardUpload(note.id)}
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
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
              <Highlight text={transcript} query={searchQuery} />
            </p>
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
