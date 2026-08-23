import { useRef, useState } from 'react'
import { formatDuration, formatRelativeTime } from './format'
import type { ClientNote } from './types'

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5.5v13l11-6.5-11-6.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2m-7 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const iconButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper hover:text-ink'

interface NoteCardProps {
  note: ClientNote
  onEdit: (id: string, text: string) => void
  onDelete: (id: string) => void
  onRetryUpload: (id: string) => void
  onDiscardUpload: (id: string) => void
}

export default function NoteCard({ note, onEdit, onDelete, onRetryUpload, onDiscardUpload }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(note.finalTranscript ?? '')
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const duration = formatDuration(note.durationMs)
  const transcript = note.finalTranscript ?? note.roughTranscript
  const hasRealId = note.status === 'ready' || note.status === 'processing'

  const startEdit = () => {
    setDraft(note.finalTranscript ?? '')
    setIsEditing(true)
  }

  const saveEdit = () => {
    setIsEditing(false)
    if (draft !== note.finalTranscript) onEdit(note.id, draft)
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.pause()
    else audio.play()
  }

  const handleDelete = () => {
    if (window.confirm("Delete this note? This can't be undone.")) onDelete(note.id)
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
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

        <div className="flex shrink-0 items-center gap-1">
          {note.localAudioUrl ? (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play recording'}
              className={iconButtonClass}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
          ) : (
            hasRealId && (
              <span
                className={`${iconButtonClass} cursor-default text-ink-soft/40 hover:bg-transparent hover:text-ink-soft/40`}
                title="Playback isn't available yet for notes from a previous session"
              >
                <PlayIcon />
              </span>
            )
          )}
          {hasRealId && (
            <button type="button" onClick={startEdit} aria-label="Edit transcript" className={iconButtonClass}>
              <PencilIcon />
            </button>
          )}
          {hasRealId && (
            <button type="button" onClick={handleDelete} aria-label="Delete note" className={iconButtonClass}>
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {note.localAudioUrl && (
        <audio
          ref={audioRef}
          src={note.localAudioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      <div className="mt-3">
        {note.status === 'upload-error' ? (
          <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500">
            <p>{note.uploadError ?? 'Upload failed.'}</p>
            <div className="mt-2 flex gap-4">
              <button type="button" className="font-medium underline" onClick={() => onRetryUpload(note.id)}>
                Retry
              </button>
              <button type="button" className="font-medium underline" onClick={() => onDiscardUpload(note.id)}>
                Discard
              </button>
            </div>
          </div>
        ) : isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="min-h-24 w-full rounded-xl border border-border bg-paper p-3 text-[16px] text-ink outline-none focus:border-brand-400"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-4 text-sm">
              <button type="button" onClick={() => setIsEditing(false)} className="text-ink-soft">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} className="font-medium text-brand-600">
                Save
              </button>
            </div>
          </div>
        ) : transcript ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{transcript}</p>
        ) : note.status === 'uploading' || note.status === 'processing' ? (
          <p className="text-sm italic text-ink-soft">Transcribing your note…</p>
        ) : (
          <p className="text-sm italic text-ink-soft">No transcript yet.</p>
        )}
        {note.isSavingEdit && <p className="mt-2 text-xs text-ink-soft">Saving…</p>}
      </div>
    </div>
  )
}
