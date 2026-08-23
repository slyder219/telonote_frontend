import { useState } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { useSelection } from '../hooks/useSelection'
import { useContextItems } from '../context/useContextItems'
import { useContextCandidates } from '../context/useContextCandidates'
import ContextItemCard from '../context/ContextItemCard'
import AddItemForm from '../context/AddItemForm'
import CandidateCard from '../context/CandidateCard'
import Banner from '../components/Banner'
import BulkActionBar from '../components/BulkActionBar'
import Button from '../components/Button'

type Tab = 'committed' | 'candidates'

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-4">
      <div className="h-3 w-32 rounded bg-border" />
      <div className="mt-4 h-3 w-full rounded bg-border" />
      <div className="mt-2 h-3 w-2/3 rounded bg-border" />
    </div>
  )
}

function SelectAllRow({
  total,
  count,
  onSelectAll,
  onClear,
}: {
  total: number
  count: number
  onSelectAll: () => void
  onClear: () => void
}) {
  if (total === 0) return null
  const allSelected = count === total
  return (
    <label className="flex items-center gap-2 px-1 text-sm text-ink-soft">
      <input
        type="checkbox"
        checked={allSelected}
        onChange={() => (allSelected ? onClear() : onSelectAll())}
        className="h-4 w-4 accent-brand-500"
      />
      Select all
    </label>
  )
}

export default function ContextPage() {
  usePageMeta('My Context — Telonote', { noindex: true })
  const [tab, setTab] = useState<Tab>('committed')

  const itemsState = useContextItems()
  const candidatesState = useContextCandidates()
  const itemSelection = useSelection()
  const candidateSelection = useSelection()

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
    await candidatesState.bulkCommit(ids)
    itemsState.refetch()
  }

  const handleBulkIgnore = async () => {
    const ids = [...candidateSelection.selectedIds]
    candidateSelection.clear()
    await candidatesState.bulkIgnore(ids)
  }

  const handleBulkDeleteItems = async () => {
    const ids = [...itemSelection.selectedIds]
    if (!window.confirm(`Delete ${ids.length} item${ids.length === 1 ? '' : 's'}? This can't be undone.`)) return
    itemSelection.clear()
    await itemsState.bulkDelete(ids)
  }

  const handleBulkAlwaysInclude = async (value: boolean) => {
    const ids = [...itemSelection.selectedIds]
    itemSelection.clear()
    await itemsState.bulkSetAlwaysInclude(ids, value)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pb-16 pt-6 sm:px-6">
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

            <SelectAllRow
              total={itemsState.items.length}
              count={itemSelection.count}
              onSelectAll={() => itemSelection.selectAll(itemsState.items.map((i) => i.id))}
              onClear={itemSelection.clear}
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
            ) : (
              itemsState.items.map((item) => (
                <ContextItemCard
                  key={item.id}
                  item={item}
                  onUpdate={itemsState.updateItem}
                  onDelete={itemsState.deleteItem}
                  selected={itemSelection.isSelected(item.id)}
                  onToggleSelect={itemSelection.toggle}
                />
              ))
            )}
          </>
        ) : (
          <>
            <SelectAllRow
              total={candidatesState.candidates.length}
              count={candidateSelection.count}
              onSelectAll={() => candidateSelection.selectAll(candidatesState.candidates.map((c) => c.id))}
              onClear={candidateSelection.clear}
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
            ) : (
              candidatesState.candidates.map((candidate) => (
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
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
