import { useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'

const ACTION_WIDTH = 84
const DEAD_ZONE = 8
const REVEAL_FRACTION = 0.4

interface SwipeableRowProps {
  children: ReactNode
  onDelete?: () => void
  onEdit?: () => void
  disabled?: boolean
}

export default function SwipeableRow({ children, onDelete, onEdit, disabled }: SwipeableRowProps) {
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const startOffset = useRef(0)
  const dragged = useRef(false)
  const justDragged = useRef(false)
  const pointerId = useRef<number | null>(null)

  const canSwipeLeft = Boolean(onDelete)
  const canSwipeRight = Boolean(onEdit)

  const close = () => setOffset(0)

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || (!canSwipeLeft && !canSwipeRight)) return
    // Let elements with their own horizontal drag behavior (the audio
    // scrubber's <input type="range">, or anything opting out explicitly)
    // handle the gesture exclusively instead of fighting over it.
    const target = event.target as HTMLElement
    if (target.closest('[data-swipe-ignore], input[type="range"]')) return
    startX.current = event.clientX
    startOffset.current = offset
    dragged.current = false
    justDragged.current = false
    pointerId.current = event.pointerId
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== event.pointerId) return
    const delta = event.clientX - startX.current
    if (!dragged.current && Math.abs(delta) < DEAD_ZONE) return

    if (!dragged.current) {
      dragged.current = true
      setIsDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    let next = startOffset.current + delta
    if (next < 0 && !canSwipeLeft) next = 0
    if (next > 0 && !canSwipeRight) next = 0
    next = Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, next))
    setOffset(next)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== event.pointerId) return
    pointerId.current = null
    setIsDragging(false)

    if (!dragged.current) return
    dragged.current = false
    justDragged.current = true

    setOffset((current) => {
      if (current <= -ACTION_WIDTH * REVEAL_FRACTION && canSwipeLeft) return -ACTION_WIDTH
      if (current >= ACTION_WIDTH * REVEAL_FRACTION && canSwipeRight) return ACTION_WIDTH
      return 0
    })
  }

  // A drag that moved past the dead zone shouldn't also register as a click
  // on whatever button happens to be under the pointer when it lifts.
  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (justDragged.current) {
      justDragged.current = false
      event.preventDefault()
      event.stopPropagation()
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      {canSwipeRight && (
        <button
          type="button"
          onClick={() => {
            close()
            onEdit?.()
          }}
          aria-label="Edit"
          className="absolute inset-y-0 left-0 flex items-center justify-center bg-brand-500 text-white"
          style={{ width: ACTION_WIDTH }}
        >
          Edit
        </button>
      )}
      {canSwipeLeft && (
        <button
          type="button"
          onClick={() => {
            close()
            onDelete?.()
          }}
          aria-label="Delete"
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-white"
          style={{ width: ACTION_WIDTH }}
        >
          Delete
        </button>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
          touchAction: canSwipeLeft || canSwipeRight ? 'pan-y' : undefined,
        }}
        className="relative bg-surface"
      >
        {children}
      </div>
    </div>
  )
}
