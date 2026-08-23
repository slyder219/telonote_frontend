import { useMemo, useState } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { useSelection } from '../hooks/useSelection'
import { useNotes } from '../notes/useNotes'
import { fuzzyMatch } from '../notes/fuzzySearch'
import RecordButton from '../notes/RecordButton'
import NoteCard from '../notes/NoteCard'
import Banner from '../components/Banner'
import BulkActionBar from '../components/BulkActionBar'
import LoadMoreButton from '../components/LoadMoreButton'
import Button from '../components/Button'

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-4">
      <div className="h-3 w-24 rounded bg-border" />
      <div className="mt-4 h-3 w-full rounded bg-border" />
      <div className="mt-2 h-3 w-2/3 rounded bg-border" />
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function Dashboard() {
  usePageMeta('Dashboard — Telonote', { noindex: true })
  const {
    notes,
    isLoadingInitial,
    isLoadingMore,
    hasMore,
    loadMore,
    loadError,
    bannerMessage,
    dismissBanner,
    uploadRecording,
    retryUpload,
    discardUpload,
    editTranscript,
    deleteNoteById,
    bulkDeleteNotes,
    retranscribeNote,
    fetchAudioUrl,
  } = useNotes()

  const [query, setQuery] = useState('')
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const selection = useSelection()

  const filteredNotes = useMemo(() => {
    if (!query.trim()) return notes
    return notes.filter((note) => fuzzyMatch(query, note.finalTranscript ?? note.roughTranscript ?? ''))
  }, [notes, query])

  const handleBulkDelete = async () => {
    const ids = [...selection.selectedIds]
    if (!window.confirm(`Delete ${ids.length} note${ids.length === 1 ? '' : 's'}? This can't be undone.`)) return
    selection.clear()
    await bulkDeleteNotes(ids)
  }

  const handleBulkCopy = async () => {
    const ids = selection.selectedIds
    const selected = notes.filter((note) => ids.has(note.id))
    const text = selected
      .map((note) => {
        const transcript = note.finalTranscript ?? note.roughTranscript ?? '(no transcript)'
        return `${new Date(note.createdAt).toLocaleString()}\n${transcript}`
      })
      .join('\n\n---\n\n')
    try {
      await navigator.clipboard.writeText(text)
      selection.clear()
      setCopyMessage(`Copied ${selected.length} note${selected.length === 1 ? '' : 's'} to clipboard.`)
    } catch {
      setCopyMessage("Couldn't copy to clipboard. Check your browser's clipboard permission.")
    }
    setTimeout(() => setCopyMessage(null), 4000)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pb-16 sm:px-6">
      <RecordButton onComplete={uploadRecording} />

      {notes.length > 0 && (
        <label className="relative mb-4 block">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-soft">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your notes…"
            className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-[16px] text-ink outline-none focus:border-brand-400"
          />
        </label>
      )}

      {bannerMessage && (
        <div className="mb-4">
          <Banner message={bannerMessage} onDismiss={dismissBanner} />
        </div>
      )}
      {copyMessage && (
        <div className="mb-4">
          <Banner message={copyMessage} onDismiss={() => setCopyMessage(null)} />
        </div>
      )}

      {notes.length > 0 && (
        <label className="mb-3 flex items-center gap-2 px-1 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={selection.count > 0 && selection.count === filteredNotes.length}
            onChange={() =>
              selection.count === filteredNotes.length
                ? selection.clear()
                : selection.selectAll(filteredNotes.map((n) => n.id))
            }
            className="h-4 w-4 accent-brand-500"
          />
          Select all
        </label>
      )}

      {selection.count > 0 && (
        <div className="mb-3">
          <BulkActionBar count={selection.count} onClear={selection.clear}>
            <Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-sm" onClick={handleBulkCopy}>
              Copy
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="!px-3 !py-1.5 !text-sm !text-red-600"
              onClick={handleBulkDelete}
            >
              Delete
            </Button>
          </BulkActionBar>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isLoadingInitial ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-center text-sm text-red-500">
            {loadError}
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-soft">
            No notes yet. Tap record to make your first one.
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-soft">
            No notes match "{query}".
          </div>
        ) : (
          filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={editTranscript}
              onDelete={deleteNoteById}
              onRetryUpload={retryUpload}
              onDiscardUpload={discardUpload}
              onRequestAudio={fetchAudioUrl}
              onRetranscribe={retranscribeNote}
              selected={selection.isSelected(note.id)}
              onToggleSelect={selection.toggle}
            />
          ))
        )}

        {!isLoadingInitial && !query && hasMore && (
          <LoadMoreButton onClick={loadMore} isLoading={isLoadingMore} />
        )}
      </div>
    </div>
  )
}
