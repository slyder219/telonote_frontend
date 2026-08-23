import { fuzzySearch } from './fuzzySearch'

interface HighlightProps {
  text: string
  query: string
  className?: string
}

export default function Highlight({ text, query, className }: HighlightProps) {
  const { segments } = fuzzySearch(query, text)
  return (
    <span className={className}>
      {segments.map((segment, i) =>
        segment.highlighted ? (
          <mark key={i} className="rounded bg-brand-200 text-ink">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </span>
  )
}
