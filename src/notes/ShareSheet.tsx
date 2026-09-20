import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import Sheet from '../components/Sheet'
import Button from '../components/Button'

function ShareGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M8 10H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SparkleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16v4M17 18h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const rowClass =
  'flex min-h-12 w-full items-center justify-between gap-4 border-t border-border px-5 py-3 text-left text-[17px] text-ink transition-colors hover:bg-ink/5 active:bg-ink/10 disabled:opacity-60'

interface ShareSheetProps {
  isOpen: boolean
  onClose: () => void
  onExited?: () => void
  transcript: string
  /** Omit to hide the AI-title option. */
  onGenerateTitle?: () => Promise<string>
}

// The share popup for one note: share the text as it is, or first add a short
// AI-written (and editable) title. Titling is deliberately its own step —
// generate, then a separate Share tap — because iOS Safari only allows
// navigator.share() straight from a tap, not after an awaited request.
export default function ShareSheet({ isOpen, onClose, onExited, transcript, onGenerateTitle }: ShareSheetProps) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} onExited={onExited} label="Share note">
      <ShareSheetBody transcript={transcript} onGenerateTitle={onGenerateTitle} onClose={onClose} />
    </Sheet>
  )
}

function ShareSheetBody({
  transcript,
  onGenerateTitle,
  onClose,
}: Pick<ShareSheetProps, 'transcript' | 'onGenerateTitle' | 'onClose'>) {
  // null = the two-choice view; a string = a generated, editable title.
  const [title, setTitle] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const titleInputId = useId()

  // Apple Notes takes the first line of shared text as the note's title.
  const share = async (withTitle?: string) => {
    const trimmed = withTitle?.trim()
    const text = trimmed ? `${trimmed}\n\n${transcript}` : transcript
    try {
      // Reached straight from a tap, nothing awaited first (see above).
      await navigator.share({ text })
      onClose()
    } catch (shareError) {
      // Dismissing the OS share sheet means "never mind" — back to the notes.
      if (shareError instanceof DOMException && shareError.name === 'AbortError') {
        onClose()
        return
      }
      setError("Couldn't open the share sheet.")
    }
  }

  const generate = async () => {
    if (!onGenerateTitle) return
    setError('')
    setIsGenerating(true)
    try {
      setTitle(await onGenerateTitle())
    } catch {
      setError("Couldn't write a title right now — you can still share without one.")
    } finally {
      setIsGenerating(false)
    }
  }

  let body: ReactNode
  if (title === null) {
    body = (
      <>
        <button type="button" onClick={() => share()} className={rowClass}>
          Share text
          <ShareGlyph />
        </button>
        {onGenerateTitle && (
          <button type="button" onClick={generate} disabled={isGenerating} className={rowClass}>
            {isGenerating ? 'Writing title…' : 'Add AI title…'}
            {isGenerating ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <SparkleGlyph />
            )}
          </button>
        )}
      </>
    )
  } else {
    body = (
      <div className="border-t border-border px-5 py-4">
        <label htmlFor={titleInputId} className="text-xs text-ink-soft">
          Title — shared as the first line
        </label>
        {/* text-[16px]: anything smaller makes iOS Safari zoom the page on focus. */}
        <input
          id={titleInputId}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          className="mt-1.5 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[16px] text-ink outline-none focus:border-brand-400"
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="secondary" className="!px-4 !py-2 !text-sm" onClick={() => setTitle(null)}>
            Back
          </Button>
          <Button type="button" variant="primary" className="!px-4 !py-2 !text-sm" onClick={() => share(title)}>
            Share
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-0">
      <div className="overflow-hidden rounded-2xl bg-surface shadow-xl">
        <div className="px-5 pb-3 pt-4 text-center">
          <p className="text-sm font-semibold text-ink">Share note</p>
          <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{transcript}</p>
        </div>
        {body}
        {error && (
          <p role="alert" className="border-t border-border px-5 py-3 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 min-h-12 w-full rounded-2xl bg-surface text-[17px] font-semibold text-ink shadow-xl transition-colors hover:bg-ink/5 active:bg-ink/10"
      >
        Cancel
      </button>
    </div>
  )
}
