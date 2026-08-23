export interface HighlightSegment {
  text: string
  highlighted: boolean
}

export interface FuzzySearchResult {
  matches: boolean
  segments: HighlightSegment[]
}

const WORD_PATTERN = /[\p{L}\p{N}]+/gu

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array<number>(n + 1).fill(0)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const [start, end] = sorted[i]
    if (start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  return merged
}

function unmatched(target: string): FuzzySearchResult {
  return { matches: false, segments: [{ text: target, highlighted: false }] }
}

function allText(target: string): FuzzySearchResult {
  return { matches: true, segments: [{ text: target, highlighted: false }] }
}

/**
 * Word-level fuzzy search: every word in the query must appear as a
 * substring of some word in the target (so "aether" finds "Aetherworks"),
 * with small-edit-distance typo tolerance as a per-word fallback. All query
 * words must match (AND) for the target to match.
 *
 * Deliberately not character-subsequence matching — with unlimited gaps,
 * that style of "fuzzy" matches almost any short query against almost any
 * paragraph, which reads as noise rather than a real search result. Matching
 * whole words also gives clean, contiguous ranges to highlight.
 */
export function fuzzySearch(query: string, target: string): FuzzySearchResult {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return allText(target)

  const queryWords = trimmedQuery.toLowerCase().match(WORD_PATTERN) ?? []
  if (queryWords.length === 0) return allText(target)

  const targetWords = [...target.toLowerCase().matchAll(WORD_PATTERN)]
  if (targetWords.length === 0) return unmatched(target)

  const ranges: [number, number][] = []

  for (const queryWord of queryWords) {
    let found = false
    for (const match of targetWords) {
      const word = match[0]
      const index = match.index ?? 0
      const subIndex = word.indexOf(queryWord)
      if (subIndex !== -1) {
        found = true
        ranges.push([index + subIndex, index + subIndex + queryWord.length])
        continue
      }
      // Typo tolerance only for longer words and near-equal lengths, so a
      // couple of stray letters can't fuzzy-match half the document.
      if (queryWord.length >= 4 && Math.abs(word.length - queryWord.length) <= 1) {
        if (levenshtein(word, queryWord) <= 1) {
          found = true
          ranges.push([index, index + word.length])
        }
      }
    }
    if (!found) return unmatched(target)
  }

  const merged = mergeRanges(ranges)
  const segments: HighlightSegment[] = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: target.slice(cursor, start), highlighted: false })
    segments.push({ text: target.slice(start, end), highlighted: true })
    cursor = end
  }
  if (cursor < target.length) segments.push({ text: target.slice(cursor), highlighted: false })

  return { matches: true, segments }
}

/** Convenience for filtering when any one of several fields may match. */
export function fuzzyMatchesAny(query: string, targets: (string | null | undefined)[]): boolean {
  if (!query.trim()) return true
  return targets.some((target) => target && fuzzySearch(query, target).matches)
}
