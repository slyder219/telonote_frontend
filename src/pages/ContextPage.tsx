import { useMemo, useState } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { useSelection } from '../hooks/useSelection'
import { useContextItems } from '../context/useContextItems'
import { useContextCandidates } from '../context/useContextCandidates'
import { fuzzyMatchesAny } from '../search/fuzzySearch'
import ContextItemCard from '../context/ContextItemCard'
import AddItemForm from '../context/AddItemForm'
import CandidateCard from '../context/CandidateCard'
import Banner from '../components/Banner'
import BulkActionBar from '../components/BulkActionBar'
import Button from '../components/Button'
import LoadMoreButton from '../components/LoadMoreButton'
import SearchInput from '../components/SearchInput'
import SelectionHeader from '../components/SelectionHeader'

type Tab = 'committed' | 'candidates'

// Neither /context/items nor /context/candidates supports limit/offset —
// everything is fetched in one shot. This just caps how much gets rendered
// at once, revealing more of what's already in memory on demand.
const PAGE_SIZE = 100

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-4">
      <div className="h-3 w-32 rounded bg-border" />
      <div className="mt-4 h-3 w-full rounded bg-border" />
      <div className="mt-2 h-3 w-2/3 rounded bg-border" />
    </div>
  )
}

export default function ContextPage() {
  usePageMeta('My Context — Telonote', { noindex: true })
  const [tab, setTab] = useState<Tab>('committed')

  const itemsState = useContextItems()
  const candidatesState = useContextCandidates()
  const itemSelection = useSelection()
  const candidateSelection = useSelection()
  const [isSelectingItems, setIsSelectingItems] = useState(false)
  const [isSelectingCandidates, setIsSelectingCandidates] = useState(false)
  const [visibleItems, setVisibleItems] = useState(PAGE_SIZE)
  const [visibleCandidates, setVisibleCandidates] = useState(PAGE_SIZE)
  const [query, setQuery] = useState('')

  const filteredItems = useMemo(() => {
    const base = !query.trim()
      ? itemsState.items
      : itemsState.items.filter((item) =>
          fuzzyMatchesAny(query, [item.term, item.description, item.category, ...item.aliases]),
        )
    // Always-include items surface first regardless of recency, since they're
    // the ones actively shaping every transcription; everything else is most
    // recent first.
    const byRecency = (a: { created_at: string }, b: { created_at: string }) =>
      b.created_at.localeCompare(a.created_at)
    const alwaysIncluded = base.filter((item) => item.always_include).sort(byRecency)
    const rest = base.filter((item) => !item.always_include).sort(byRecency)
    return [...alwaysIncluded, ...rest]
  }, [itemsState.items, query])

  const filteredCandidates = useMemo(() => {
    if (!query.trim()) return candidatesState.candidates
    return candidatesState.candidates.filter((candidate) =>
      fuzzyMatchesAny(query, [
        candidate.proposed_term,
        candidate.proposed_description,
        candidate.proposed_category,
        ...candidate.aliases,
      ]),
    )
  }, [candidatesState.candidates, query])

  // Committing or merging a candidate creates/mutates a context item
  // server-side, but the resolved-candidate response doesn't include that
  // item — refresh the committed list rather than let it go stale.
  const handleCommit = async (candidateId: string) => {
    await candidatesState.commit(candidateId)
    itemsState.refetch()
  }

  const handleMerge = async (candidateId: string, contextItemId: string) => {
    await candidatesState.merge(candidateId, contextItemId)
    itemsState.refetch()
  }

  const handleBulkCommit = async () => {
    const ids = [...candidateSelection.selectedIds]
    candidateSelection.clear()
    setIsSelectingCandidates(false)
    await candidatesState.bulkCommit(ids)
    itemsState.refetch()
  }

  const handleBulkIgnore = async () => {
    const ids = [...candidateSelection.selectedIds]
    candidateSelection.clear()
    setIsSelectingCandidates(false)
    await candidatesState.bulkIgnore(ids)
  }

  const handleBulkDeleteItems = async () => {
    const ids = [...itemSelection.selectedIds]
    if (!window.confirm(`Delete ${ids.length} item${ids.length === 1 ? '' : 's'}? This can't be undone.`)) return
    itemSelection.clear()
    setIsSelectingItems(false)
    await itemsState.bulkDelete(ids)
  }

  const handleBulkAlwaysInclude = async (value: boolean) => {
    const ids = [...itemSelection.selectedIds]
    itemSelection.clear()
    setIsSelectingItems(false)
    await itemsState.bulkSetAlwaysInclude(ids, value)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pb-24 pt-6 sm:px-6 sm:pb-16">
      <h1 className="text-xl font-semibold tracking-tight text-ink">My Context</h1>
      <p className="mt-1 text-sm text-ink-soft">
        The vocabulary Telonote uses to transcribe you more accurately.
      </p>

      <div className="mt-5 flex gap-1 rounded-full bg-surface p-1">
        <button
          type="button"
          onClick={() => setTab('committed')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'committed' ? 'bg-brand-500 text-white' : 'text-ink-soft'
          }`}
        >
          Committed
        </button>
        <button
          type="button"
          onClick={() => setTab('candidates')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'candidates' ? 'bg-brand-500 text-white' : 'text-ink-soft'
          }`}
        >
          Candidates
          {candidatesState.candidates.length > 0 && (
            <span className="ml-1.5 rounded-full bg-white/25 px-1.5 py-0.5 text-xs">
              {candidatesState.candidates.length}
            </span>
          )}
        </button>
      </div>

      {(itemsState.items.length > 0 || candidatesState.candidates.length > 0) && (
        <div className="mt-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search your context…" />
        </div>
      )}

      {tab === 'committed' && itemsState.bannerMessage && (
        <div className="mt-4">
          <Banner message={itemsState.bannerMessage} onDismiss={itemsState.dismissBanner} />
        </div>
      )}
      {tab === 'candidates' && candidatesState.bannerMessage && (
        <div className="mt-4">
          <Banner message={candidatesState.bannerMessage} onDismiss={candidatesState.dismissBanner} />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {tab === 'committed' ? (
          <>
            <AddItemForm onAdd={itemsState.createItem} />

            <SelectionHeader
              total={filteredItems.length}
              isSelecting={isSelectingItems}
              onStartSelecting={() => setIsSelectingItems(true)}
              onCancel={() => {
                setIsSelectingItems(false)
                itemSelection.clear()
              }}
              allSelected={itemSelection.count > 0 && itemSelection.count === filteredItems.length}
              onToggleSelectAll={() =>
                itemSelection.count === filteredItems.length
                  ? itemSelection.clear()
                  : itemSelection.selectAll(filteredItems.map((i) => i.id))
              }
            />

            {itemSelection.count > 0 && (
              <BulkActionBar count={itemSelection.count} onClear={itemSelection.clear}>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-sm"
                  onClick={() => handleBulkAlwaysInclude(true)}
                >
                  Always include: On
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-sm"
                  onClick={() => handleBulkAlwaysInclude(false)}
                >
                  Always include: Off
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-sm !text-red-600"
                  onClick={handleBulkDeleteItems}
                >
                  Delete
                </Button>
              </BulkActionBar>
            )}

            {itemsState.isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : itemsState.loadError ? (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-center text-sm text-red-500">
                {itemsState.loadError}
              </div>
            ) : itemsState.items.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-soft">
                No committed context yet.
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-soft">
                No items match "{query}".
              </div>
            ) : (
              <>
                {(query.trim() ? filteredItems : filteredItems.slice(0, visibleItems)).map((item) => (
                  <ContextItemCard
                    key={item.id}
                    item={item}
                    onUpdate={itemsState.updateItem}
                    onDelete={itemsState.deleteItem}
                    selected={itemSelection.isSelected(item.id)}
                    onToggleSelect={itemSelection.toggle}
                    searchQuery={query}
                    isSelecting={isSelectingItems}
                  />
                ))}
                {!query.trim() && filteredItems.length > visibleItems && (
                  <LoadMoreButton onClick={() => setVisibleItems((n) => n + PAGE_SIZE)} isLoading={false} />
                )}
              </>
            )}
          </>
        ) : (
          <>
            <SelectionHeader
              total={filteredCandidates.length}
              isSelecting={isSelectingCandidates}
              onStartSelecting={() => setIsSelectingCandidates(true)}
              onCancel={() => {
                setIsSelectingCandidates(false)
                candidateSelection.clear()
              }}
              allSelected={candidateSelection.count > 0 && candidateSelection.count === filteredCandidates.length}
              onToggleSelectAll={() =>
                candidateSelection.count === filteredCandidates.length
                  ? candidateSelection.clear()
                  : candidateSelection.selectAll(filteredCandidates.map((c) => c.id))
              }
            />

            {candidateSelection.count > 0 && (
              <BulkActionBar count={candidateSelection.count} onClear={candidateSelection.clear}>
                <Button type="button" variant="primary" className="!px-3 !py-1.5 !text-sm" onClick={handleBulkCommit}>
                  Commit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-sm"
                  onClick={handleBulkIgnore}
                >
                  Ignore
                </Button>
              </BulkActionBar>
            )}

            {candidatesState.isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : candidatesState.loadError ? (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-center text-sm text-red-500">
                {candidatesState.loadError}
              </div>
            ) : candidatesState.candidates.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-soft">
                No pending candidates. New ones show up here after a note is transcribed.
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-soft">
                No candidates match "{query}".
              </div>
            ) : (
              <>
                {(query.trim() ? filteredCandidates : filteredCandidates.slice(0, visibleCandidates)).map(
                  (candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      existingItems={itemsState.items}
                      onEdit={candidatesState.editCandidate}
                      onCommit={handleCommit}
                      onMerge={handleMerge}
                      onIgnore={candidatesState.ignore}
                      selected={candidateSelection.isSelected(candidate.id)}
                      onToggleSelect={candidateSelection.toggle}
                      searchQuery={query}
                      isSelecting={isSelectingCandidates}
                    />
                  ),
                )}
                {!query.trim() && filteredCandidates.length > visibleCandidates && (
                  <LoadMoreButton onClick={() => setVisibleCandidates((n) => n + PAGE_SIZE)} isLoading={false} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
