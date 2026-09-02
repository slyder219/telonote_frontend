import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { formatDuration, formatTimeOfDay } from './format'
import Button from '../components/Button'
import SwipeableRow from '../components/SwipeableRow'
import SelectionCircle from '../components/SelectionCircle'
import ColorSwatchPicker from '../components/ColorSwatchPicker'
import AudioScrubber from './AudioScrubber'
import Highlight from '../search/Highlight'
import type { ClientNote } from './types'
import type { QuotaInfo } from '../api/client'
import type { NoteColor } from '../api/notes'

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

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}

// Literal class-per-color maps, not template-built strings — see
// ColorSwatchPicker.tsx for why (Tailwind's build-time class scanner).
const COLOR_WASH_CLASSES: Record<NoteColor, string> = {
  red: 'bg-red-500/10',
  orange: 'bg-orange-500/10',
  yellow: 'bg-yellow-500/10',
  green: 'bg-green-500/10',
  blue: 'bg-blue-500/10',
  purple: 'bg-purple-500/10',
  pink: 'bg-pink-500/10',
}
const COLOR_DOT_CLASSES: Record<NoteColor, string> = {
  red: 'text-red-500',
  orange: 'text-orange-500',
  yellow: 'text-yellow-500',
  green: 'text-green-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  pink: 'text-pink-500',
}

function ColorDotIcon({ color }: { color: NoteColor | null }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill={color ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        className={color ? COLOR_DOT_CLASSES[color] : 'text-ink-soft'}
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
  'flex h-8 w-10 items-center justify-center rounded-full bg-paper text-ink transition-colors active:bg-border'
const playButtonClass =
  'flex h-8 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors active:bg-brand-100'
const dangerButtonClass =
  'flex h-8 w-10 items-center justify-center rounded-full bg-paper text-ink transition-colors active:bg-red-500/15 active:text-red-500'

interface NoteCardProps {
  note: ClientNote
  onEdit?: (id: string, text: string) => void
  onDelete?: (id: string) => void
  onRetryUpload?: (id: string) => void
  onDiscardUpload?: (id: string) => void
  onRequestAudio: (id: string) => Promise<string>
  onRetranscribe?: (id: string) => void
  onSetColor?: (id: string, color: NoteColor | null) => void
  onToggleCompleted?: (id: string) => void
  selected?: boolean
  onToggleSelect?: (id: string) => void
  searchQuery: string
  quota?: QuotaInfo | null
  isSelecting?: boolean
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onRetryUpload,
  onDiscardUpload,
  onRequestAudio,
  onRetranscribe,
  onSetColor,
  onToggleCompleted,
  selected = false,
  onToggleSelect,
  searchQuery,
  quota = null,
  isSelecting = false,
}: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(note.finalTranscript ?? '')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isActionsExpanded, setIsActionsExpanded] = useState(false)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
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
  const isQuotaExhausted = quota !== null && quota.remainingBytes <= 0
  // Mutually exclusive by construction, never combined: selection tint wins
  // over the completed "greyish" wash, which wins over the note's own
  // color — so completing a colored note visibly overrides its color.
  const rowBgClass =
    selected && isSelecting
      ? 'bg-brand-50/60'
      : note.completed
        ? 'bg-ink-soft/10'
        : note.color
          ? COLOR_WASH_CLASSES[note.color]
          : ''
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
    setIsActionsExpanded(false)
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
    setIsActionsExpanded(false)
    if (window.confirm("Delete this note? This can't be undone.")) onDelete?.(note.id)
  }

  const handleCopy = async () => {
    if (!transcript) return
    setIsActionsExpanded(false)
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
    setIsActionsExpanded(false)
    setIsRetranscribingFlag(true)
    onRetranscribe?.(note.id)
  }

  const handleDownload = async () => {
    setIsActionsExpanded(false)
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

  const handleRowClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) return
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select')) return
    onToggleSelect?.(note.id)
  }

  return (
    <SwipeableRow
      onDelete={hasRealId ? handleDelete : undefined}
      onEdit={hasRealId ? startEdit : undefined}
      disabled={isSelecting}
    >
      <div onClick={handleRowClick} className={`p-4 ${isSelecting ? 'cursor-pointer' : ''} ${rowBgClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
            {isSelecting && (
              <SelectionCircle
                selected={selected}
                onToggle={() => onToggleSelect?.(note.id)}
                label="Select note"
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
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-2 py-0.5 text-white">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Sending…
              </span>
            )}
            {note.status === 'processing' && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-2 py-0.5 text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Transcribing…
              </span>
            )}
          </div>

          {!isSelecting && (
            <>
              {/* Full inline row — plenty of room on a desktop-width screen. */}
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
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
                {hasRealId && (
                  <SelectionCircle
                    selected={note.completed}
                    onToggle={() => onToggleCompleted?.(note.id)}
                    label={note.completed ? 'Mark note not completed' : 'Mark note completed'}
                  />
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
                {hasRealId && (
                  <button
                    type="button"
                    onClick={handleRetranscribe}
                    disabled={isQuotaExhausted}
                    aria-label="Re-run transcription"
                    title={
                      isQuotaExhausted ? "Daily limit reached — can't re-transcribe until it resets." : undefined
                    }
                    className={`${iconButtonClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:active:bg-paper`}
                  >
                    <RefreshIcon />
                  </button>
                )}
                {hasRealId && (
                  <button
                    type="button"
                    onClick={() => setIsColorPickerOpen((open) => !open)}
                    aria-label="Set note color"
                    aria-expanded={isColorPickerOpen}
                    className={iconButtonClass}
                  >
                    <ColorDotIcon color={note.color} />
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

              {/* Mobile: "⋯" rolls the rest out sideways on the same row
                  (a real sliding reveal via an animated max-width, not a
                  popover — a popover here would get clipped by this card's
                  own overflow-hidden ancestor in SwipeableRow). Only wraps
                  to a second line if the row truly runs out of width, via
                  the same flex-wrap the timestamp row already uses.
                  Edit/delete are also one swipe away, but stay listed here
                  too since swipe isn't always discoverable. */}
              <div className="flex shrink-0 items-center gap-2 sm:hidden">
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
                {hasRealId && (
                  <SelectionCircle
                    selected={note.completed}
                    onToggle={() => onToggleCompleted?.(note.id)}
                    label={note.completed ? 'Mark note not completed' : 'Mark note completed'}
                  />
                )}
                {/* This wrapper sits before the "⋯" toggle so the reveal
                    grows out of its left rather than pushing the toggle
                    itself sideways — the toggle stays put either way since
                    it's still the row's last, right-anchored item. */}
                {hasRealId && (
                  <div
                    className="shrink-0 overflow-hidden transition-[max-width] duration-300 ease-out"
                    style={{ maxWidth: isActionsExpanded ? 310 : 0 }}
                  >
                    <div className="flex items-center gap-2 pr-2">
                      {transcript && (
                        <button
                          type="button"
                          onClick={handleCopy}
                          aria-label="Copy transcript"
                          className={`${iconButtonClass} shrink-0`}
                        >
                          {justCopied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        aria-label="Download audio"
                        className={`${iconButtonClass} shrink-0`}
                      >
                        {isDownloading ? <SpinnerIcon /> : <DownloadIcon />}
                      </button>
                      <button
                        type="button"
                        onClick={handleRetranscribe}
                        disabled={isQuotaExhausted}
                        aria-label="Re-run transcription"
                        title={
                          isQuotaExhausted
                            ? "Daily limit reached — can't re-transcribe until it resets."
                            : undefined
                        }
                        className={`${iconButtonClass} shrink-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:bg-paper`}
                      >
                        <RefreshIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsColorPickerOpen((open) => !open)}
                        aria-label="Set note color"
                        aria-expanded={isColorPickerOpen}
                        className={`${iconButtonClass} shrink-0`}
                      >
                        <ColorDotIcon color={note.color} />
                      </button>
                      <button
                        type="button"
                        onClick={startEdit}
                        aria-label="Edit transcript"
                        className={`${iconButtonClass} shrink-0`}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        aria-label="Delete note"
                        className={`${dangerButtonClass} shrink-0`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                )}
                {hasRealId && (
                  <button
                    type="button"
                    onClick={() => setIsActionsExpanded((expanded) => !expanded)}
                    aria-label="More actions"
                    aria-expanded={isActionsExpanded}
                    className={iconButtonClass}
                  >
                    <DotsIcon />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {isColorPickerOpen && (
          <ColorSwatchPicker
            value={note.color}
            onChange={(color) => {
              onSetColor?.(note.id, color)
              setIsColorPickerOpen(false)
            }}
          />
        )}

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
            <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500">
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
                <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-2 py-0.5 text-xs text-white">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Re-transcribing…
                </p>
              )}
              <p
                className={`whitespace-pre-wrap rounded-lg text-[15px] leading-relaxed transition-opacity duration-700 ${
                  note.completed ? 'text-ink-soft' : 'text-ink'
                } ${isRetranscribingNow ? 'opacity-50' : ''} ${justUpdated ? 'reveal-flash' : ''}`}
              >
                <Highlight text={transcript} query={searchQuery} />
              </p>
            </div>
          ) : note.status === 'uploading' || note.status === 'processing' ? (
            <div className="flex flex-col gap-2">
              <div className="shimmer h-3.5 w-full rounded" />
              <div className="shimmer h-3.5 w-4/5 rounded" />
              <div className="shimmer h-3.5 w-2/5 rounded" />
            </div>
          ) : (
            <p className="text-sm italic text-ink-soft">No transcript yet.</p>
          )}
          {note.isSavingEdit && <p className="mt-2 text-xs text-ink-soft">Saving…</p>}
        </div>
      </div>
    </SwipeableRow>
  )
}
