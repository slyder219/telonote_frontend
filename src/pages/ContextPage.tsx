import { useState } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { useContextItems } from '../context/useContextItems'
import { useContextCandidates } from '../context/useContextCandidates'
import ContextItemCard from '../context/ContextItemCard'
import AddItemForm from '../context/AddItemForm'
import CandidateCard from '../context/CandidateCard'
import Banner from '../components/Banner'

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

export default function ContextPage() {
  usePageMeta('My Context — Telonote', { noindex: true })
  const [tab, setTab] = useState<Tab>('committed')

  const itemsState = useContextItems()
  const candidatesState = useContextCandidates()

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
                />
              ))
            )}
          </>
        ) : candidatesState.isLoading ? (
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
            />
          ))
        )}
      </div>
    </div>
  )
}
