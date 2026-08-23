import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { useSelection } from '../hooks/useSelection'
import { useNotes } from '../notes/useNotes'
import { fuzzySearch } from '../search/fuzzySearch'
import { groupNotesByDay } from '../notes/groupByDay'
import type { ClientNote } from '../notes/types'
import RecordButton from '../notes/RecordButton'
import UploadAudioButton from '../notes/UploadAudioButton'
import NoteCard from '../notes/NoteCard'
import Banner from '../components/Banner'
import BulkActionBar from '../components/BulkActionBar'
import LoadMoreButton from '../components/LoadMoreButton'
import Button from '../components/Button'
import SearchInput from '../components/SearchInput'

type SearchMode = 'text' | 'meaning'

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-4">
      <div className="h-3 w-24 rounded bg-border" />
      <div className="mt-4 h-3 w-full rounded bg-border" />
      <div className="mt-2 h-3 w-2/3 rounded bg-border" />
    </div>
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
    searchByMeaning,
    quota,
  } = useNotes()

  const [searchMode, setSearchMode] = useState<SearchMode>('text')
  const [query, setQuery] = useState('')
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const selection = useSelection()

  const [meaningQuery, setMeaningQuery] = useState('')
  const [meaningResults, setMeaningResults] = useState<ClientNote[] | null>(null)
  const [isSearchingMeaning, setIsSearchingMeaning] = useState(false)
  const [meaningError, setMeaningError] = useState<string | null>(null)

  const filteredNotes = useMemo(() => {
    if (!query.trim()) return notes
    return notes.filter(
      (note) => fuzzySearch(query, note.finalTranscript ?? note.roughTranscript ?? '').matches,
    )
  }, [notes, query])

  const noteGroups = useMemo(() => groupNotesByDay(filteredNotes), [filteredNotes])

  const handleMeaningSearch = async (event: FormEvent) => {
    event.preventDefault()
    const q = meaningQuery.trim()
    if (!q) return
    setIsSearchingMeaning(true)
    setMeaningError(null)
    try {
      setMeaningResults(await searchByMeaning(q))
    } catch (error) {
      setMeaningResults(null)
      setMeaningError(error instanceof Error ? error.message : 'Search failed.')
    } finally {
      setIsSearchingMeaning(false)
    }
  }

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
      <RecordButton onComplete={uploadRecording} quota={quota} />
      <div className="mb-4 flex justify-center">
        <UploadAudioButton onUpload={uploadRecording} />
      </div>

      {notes.length > 0 && (
        <div className="mb-4 flex gap-1 rounded-full bg-surface p-1">
          <button
            type="button"
            onClick={() => setSearchMode('text')}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              searchMode === 'text' ? 'bg-brand-500 text-white' : 'text-ink-soft'
            }`}
          >
            Search text
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('meaning')}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              searchMode === 'meaning' ? 'bg-brand-500 text-white' : 'text-ink-soft'
            }`}
          >
            Search by meaning
          </button>
        </div>
      )}

      {searchMode === 'text' && notes.length > 0 && (
        <div className="mb-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search your notes…" />
        </div>
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

      {searchMode === 'meaning' ? (
        <div className="flex flex-col gap-3">
          <form onSubmit={handleMeaningSearch} className="flex gap-2">
            <div className="flex-1">
              <SearchInput
                value={meaningQuery}
                onChange={setMeaningQuery}
                placeholder="Describe what the note was about…"
              />
            </div>
            <Button type="submit" variant="primary" isLoading={isSearchingMeaning} className="!px-4">
              Search
            </Button>
          </form>

          {meaningError && (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-center text-sm text-red-500">
              {meaningError}
            </div>
          )}

          {!meaningError && meaningResults === null && !isSearchingMeaning && (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-soft">
              Search finds notes by what they mean, not just matching words — try "that call about the budget"
              even if the note never says "budget".
            </div>
          )}

          {meaningResults !== null && meaningResults.length === 0 && !isSearchingMeaning && (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-soft">
              No notes matched "{meaningQuery}".
            </div>
          )}

          {meaningResults?.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onRequestAudio={fetchAudioUrl}
              searchQuery=""
              readOnly
            />
          ))}
        </div>
      ) : (
        <>
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

          <div className="flex flex-col gap-5">
            {isLoadingInitial ? (
              <div className="flex flex-col gap-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
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
              noteGroups.map((group) => (
                <div key={group.key}>
                  <h2 className="mb-2 px-1 text-sm font-semibold text-ink-soft">{group.label}</h2>
                  <div className="flex flex-col gap-3">
                    {group.notes.map((note) => (
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
                        searchQuery={query}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}

            {!isLoadingInitial && !query && hasMore && (
              <LoadMoreButton onClick={loadMore} isLoading={isLoadingMore} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
