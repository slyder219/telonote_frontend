import { dayKey, dayLabel } from './format'
import type { ClientNote } from './types'

export interface NoteDayGroup {
  key: string
  label: string
  notes: ClientNote[]
}

/**
 * Groups notes by local calendar day. Relies on the input already being
 * newest-first (true throughout this app — API order plus optimistic
 * prepends) so groups come out sorted newest-day-first for free, and notes
 * within each group stay newest-first too (completed notes excepted — see
 * below, they sink to the bottom of their own day).
 */
export function groupNotesByDay(notes: ClientNote[]): NoteDayGroup[] {
  const groups: NoteDayGroup[] = []
  const indexByKey = new Map<string, number>()

  for (const note of notes) {
    const key = dayKey(note.createdAt)
    let index = indexByKey.get(key)
    if (index === undefined) {
      index = groups.length
      indexByKey.set(key, index)
      groups.push({ key, label: dayLabel(note.createdAt), notes: [] })
    }
    groups[index].notes.push(note)
  }

  // Completed notes sink to the bottom within their own day only - a
  // stable partition (Array.filter preserves relative order), not a sort.
  // Cross-day order and the newest-first order within each subset are both
  // untouched.
  for (const group of groups) {
    group.notes = [...group.notes.filter((note) => !note.completed), ...group.notes.filter((note) => note.completed)]
  }

  return groups
}
