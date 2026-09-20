import { useCallback, useRef, useState } from 'react'

export interface ToggleOptions {
  /** Extend the selection from the last plain-clicked item to this one. */
  shiftKey?: boolean
  /** Ids in on-screen order — what a shift-click range is measured against. */
  order?: string[]
}

export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // The last item picked without shift: where the next shift-click's range starts.
  const anchor = useRef<string | null>(null)

  // A plain (or ctrl/cmd) click flips just that item and becomes the new
  // anchor; a shift-click adds everything between the anchor and it.
  const toggle = useCallback((id: string, { shiftKey, order }: ToggleOptions = {}) => {
    const from = anchor.current
    if (shiftKey && from !== null && order) {
      const a = order.indexOf(from)
      const b = order.indexOf(id)
      if (a !== -1 && b !== -1) {
        const range = order.slice(Math.min(a, b), Math.max(a, b) + 1)
        setSelected((current) => new Set([...current, ...range]))
        // Shift-click would otherwise also highlight the text between the rows.
        window.getSelection()?.removeAllRanges()
        return
      }
    }
    anchor.current = id
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    anchor.current = null
    setSelected(new Set(ids))
  }, [])
  const clear = useCallback(() => {
    anchor.current = null
    setSelected(new Set())
  }, [])
  const isSelected = useCallback((id: string) => selected.has(id), [selected])

  return { selectedIds: selected, toggle, selectAll, clear, isSelected, count: selected.size }
}
