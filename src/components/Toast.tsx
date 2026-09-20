import { useEffect, useRef, useState } from 'react'

export interface ToastData {
  message: string
  actionLabel?: string
  onAction?: () => void
  /** Change this to restart the auto-dismiss timer for a toast that was updated in place. */
  resetKey?: number
}

interface ToastProps {
  toast: ToastData | null
  onDismiss: () => void
  durationMs?: number
}

// A bottom "snackbar" with an optional action (e.g. Undo). The wrapping
// role="status" region is always mounted — screen readers only reliably
// announce changes inside a live region that already existed, not one that
// appears together with its text. Long enough (8s) to reach the action, and
// paused while the pointer or focus is on it.
export default function Toast({ toast, onDismiss, durationMs = 8000 }: ToastProps) {
  const [isPaused, setIsPaused] = useState(false)
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })

  const isShowing = toast !== null
  const resetKey = toast?.resetKey
  useEffect(() => {
    if (!isShowing || isPaused) return
    const timer = window.setTimeout(() => onDismissRef.current(), durationMs)
    return () => window.clearTimeout(timer)
  }, [isShowing, isPaused, resetKey, durationMs])

  return (
    // Sits above the mobile bottom tab bar (~4rem + the iPhone home-indicator inset).
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 sm:bottom-6"
    >
      {toast && (
        <div
          onPointerEnter={() => setIsPaused(true)}
          onPointerLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
          className="toast-rise pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-brand-500 py-1 pl-4 pr-1 text-sm text-white shadow-lg"
        >
          <span className="py-2">{toast.message}</span>
          <div className="flex shrink-0 items-center">
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.()
                  onDismiss()
                }}
                className="min-h-11 rounded-full px-3 font-semibold text-brand-100 transition-colors hover:bg-white/10 active:bg-white/20"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="flex h-11 w-11 items-center justify-center rounded-full text-brand-200 transition-colors hover:bg-white/10 active:bg-white/20"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
