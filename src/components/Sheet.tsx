import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// Matches the closing animations in index.css (.sheet-dialog[data-state='closing']).
const EXIT_MS = 220

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  /** Accessible name of the dialog. */
  label: string
  /** Called once the exit animation has finished and the sheet is gone. */
  onExited?: () => void
  children: ReactNode
}

// An iOS-style bottom sheet on phones, a centered card from 640px up. Built on
// a native <dialog> opened with showModal(): the browser supplies the focus
// trap, Escape-to-dismiss, an inert page behind it and the top layer, so it
// can't be clipped or trapped under other UI. Children are only mounted while
// it's open (plus its exit animation), so any state inside resets on every
// open — nothing can be left "stuck" from last time.
export default function Sheet({ isOpen, onClose, label, onExited, children }: SheetProps) {
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>(isOpen ? 'open' : 'closed')
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const onExitedRef = useRef(onExited)
  const exitedPending = useRef(false)
  useEffect(() => {
    onExitedRef.current = onExited
  })

  // Follow the `isOpen` prop (adjusted during render, not in an effect, so
  // there's no extra paint with stale state): opening is immediate, closing
  // goes through "closing" so the exit animation can play.
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    setPhase(isOpen ? 'open' : (current) => (current === 'open' ? 'closing' : current))
  }

  useEffect(() => {
    if (phase !== 'closing') return
    const exitMs = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_MS
    const timer = window.setTimeout(() => {
      exitedPending.current = true
      setPhase('closed')
    }, exitMs)
    return () => window.clearTimeout(timer)
  }, [phase])

  // Fire onExited only AFTER the dialog has left the DOM. While a modal dialog
  // is still open the rest of the page is inert, so a focus() call made any
  // earlier (e.g. handing focus back to the trigger) silently does nothing.
  useEffect(() => {
    if (phase !== 'closed' || !exitedPending.current) return
    exitedPending.current = false
    onExitedRef.current?.()
  }, [phase])

  const isRendered = phase !== 'closed'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!isRendered || !dialog || dialog.open) return
    // Falls back to a plain `open` attribute where showModal is missing.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }, [isRendered])

  // The page behind a modal dialog can still scroll on iOS; lock it while open.
  useEffect(() => {
    if (!isRendered) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isRendered])

  if (!isRendered) return null

  // Pointer events must not bubble (through React's tree) into the note row's
  // swipe handler underneath — dragging inside the sheet would slide the row.
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      data-state={phase}
      inert={phase === 'closing'}
      className="sheet-dialog"
      onCancel={(event) => {
        // Escape: run our own animated close instead of the instant native one.
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        stop(event)
        // A click on the backdrop lands on the <dialog> itself; the content
        // fills it, so real content clicks have a different target.
        if (event.target === event.currentTarget) onClose()
      }}
      onPointerDown={stop}
      onPointerMove={stop}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      {children}
    </dialog>
  )
}
