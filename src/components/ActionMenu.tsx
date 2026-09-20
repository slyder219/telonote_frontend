import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'

export interface ActionMenuItem {
  key: string
  label: string
  onSelect: () => void
  /** Drawn on the right, like iOS's own context menus. */
  icon?: ReactNode
  /** A small second line under the label (e.g. why the item is disabled). */
  hint?: string
  destructive?: boolean
  disabled?: boolean
}

export interface ActionMenuTriggerProps {
  ref: Ref<HTMLButtonElement>
  onClick: () => void
  'aria-haspopup': 'menu'
  'aria-expanded': boolean
  'aria-controls': string | undefined
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  /** Accessible name for the menu itself. */
  label: string
  /** Spread the given props onto the button that should open the menu. */
  renderTrigger: (props: ActionMenuTriggerProps) => ReactNode
  /** Which edge of the trigger the menu lines up with. */
  align?: 'start' | 'end'
}

const MENU_WIDTH = 248
// Matches .menu-out in index.css. Zero under prefers-reduced-motion, where that
// animation is disabled and lingering on screen would just feel laggy.
const EXIT_MS = 140
const EDGE = 8
const GAP = 6

interface Placement {
  top: number
  left: number
  origin: string
}

// A list menu in the style of iOS's native context menu: rounded, blurred
// translucent panel, label on the left and icon on the right, hairline
// dividers, destructive action in red.
//
// It renders through a portal with fixed positioning on purpose — the note
// card's swipe wrapper clips overflow, so an absolutely-positioned dropdown
// inside it would be cut off. Dismisses on outside tap, Escape, scroll or
// resize; arrow keys/Home/End move between items; focus returns to the
// trigger when it closes.
export default function ActionMenu({ items, label, renderTrigger, align = 'end' }: ActionMenuProps) {
  // closed -> open -> closing -> closed. "closing" keeps the menu mounted for
  // its exit animation; it is inert then, so it can't be tapped or focused.
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed')
  const [placement, setPlacement] = useState<Placement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const exitTimer = useRef<number | null>(null)
  const menuId = useId()
  const isOpen = phase === 'open'
  const isRendered = phase !== 'closed'

  const clearExitTimer = useCallback(() => {
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current)
    exitTimer.current = null
  }, [])

  const open = () => {
    clearExitTimer()
    setPhase('open')
  }

  const close = useCallback(
    (restoreFocus: boolean) => {
      if (!isOpen) return
      setPhase('closing')
      if (restoreFocus) triggerRef.current?.focus()
      const exitMs = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_MS
      clearExitTimer()
      exitTimer.current = window.setTimeout(() => {
        setPhase('closed')
        setPlacement(null)
      }, exitMs)
    },
    [isOpen, clearExitTimer],
  )

  useEffect(() => clearExitTimer, [clearExitTimer])

  // Measure after the (still hidden) menu mounts, then place it before paint.
  // Flips above the trigger when there isn't room below.
  useLayoutEffect(() => {
    // Also re-runs when reopening mid-exit (isOpen flips back to true while it
    // is still mounted), so the position is never stale.
    if (!isRendered || !isOpen) return
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const t = trigger.getBoundingClientRect()
    const height = menu.offsetHeight
    const rawLeft = align === 'end' ? t.right - MENU_WIDTH : t.left
    const left = Math.max(EDGE, Math.min(rawLeft, window.innerWidth - MENU_WIDTH - EDGE))
    const spaceBelow = window.innerHeight - t.bottom - GAP - EDGE
    const spaceAbove = t.top - GAP - EDGE
    const openUp = height > spaceBelow && spaceAbove > spaceBelow
    const top = openUp ? Math.max(EDGE, t.top - GAP - height) : t.bottom + GAP
    setPlacement({ top, left, origin: `${t.left + t.width / 2 - left}px ${openUp ? 'bottom' : 'top'}` })
  }, [isRendered, isOpen, align])

  // Put focus on the first usable item once the menu is actually visible.
  const isPlaced = placement !== null
  useEffect(() => {
    if (!isOpen || !isPlaced) return
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true })
  }, [isOpen, isPlaced])

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close(true)
    }
    const onScrollOrResize = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return
      close(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [isOpen, close])

  const handleSelect = (item: ActionMenuItem) => {
    close(false)
    item.onSelect()
    // If the action didn't move focus somewhere itself (e.g. into an edit
    // box), hand it back to the trigger rather than dropping it on <body>.
    setTimeout(() => {
      if (!document.activeElement || document.activeElement === document.body) triggerRef.current?.focus()
    }, 0)
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'))
    if (enabled.length === 0) return
    const current = enabled.indexOf(document.activeElement as HTMLElement)
    let next: number | null = null
    if (event.key === 'ArrowDown') next = (current + 1) % enabled.length
    else if (event.key === 'ArrowUp') next = (current - 1 + enabled.length) % enabled.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = enabled.length - 1
    else if (event.key === 'Tab') {
      // The menu lives at the end of <body>; letting Tab run its course
      // would strand focus far from the trigger.
      event.preventDefault()
      close(true)
      return
    }
    if (next === null) return
    event.preventDefault()
    enabled[next].focus()
  }

  return (
    <>
      {renderTrigger({
        ref: triggerRef,
        onClick: () => (isOpen ? close(false) : open()),
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
        'aria-controls': isOpen ? menuId : undefined,
      })}
      {isRendered &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={handleMenuKeyDown}
            inert={!isOpen}
            // Portaled, but React still bubbles events to the note row's swipe
            // handler - sliding a finger over the menu must not drag the row.
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onPointerCancel={(event) => event.stopPropagation()}
            style={{
              top: placement?.top ?? 0,
              left: placement?.left ?? 0,
              width: MENU_WIDTH,
              maxHeight: window.innerHeight - EDGE * 2,
              transformOrigin: placement?.origin,
              visibility: placement ? 'visible' : 'hidden',
            }}
            className={`fixed z-50 overflow-y-auto rounded-2xl border border-border bg-surface/90 text-ink shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl ${
              placement ? (isOpen ? 'menu-in' : 'menu-out') : ''
            }`}
          >
            {items.map((item, index) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => handleSelect(item)}
                className={`flex min-h-11 w-full items-center justify-between gap-4 px-4 py-2 text-left text-[15px] transition-colors hover:bg-ink/5 focus-visible:bg-ink/10 focus-visible:outline-offset-[-2px] active:bg-ink/10 disabled:opacity-40 disabled:hover:bg-transparent ${
                  index > 0 ? 'border-t border-border' : ''
                } ${item.destructive ? 'text-danger' : ''}`}
              >
                <span className="min-w-0">
                  {item.label}
                  {item.hint && <span className="block text-xs text-ink-soft">{item.hint}</span>}
                </span>
                {item.icon && (
                  <span className="shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
