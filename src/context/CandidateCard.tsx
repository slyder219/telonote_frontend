import { useState } from 'react'
import Button from '../components/Button'
import TextField from '../components/TextField'
import type { ContextCandidate, ContextItem, UpdateCandidateInput } from '../api/context'

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const iconButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink transition-colors active:bg-border'

interface CandidateCardProps {
  candidate: ContextCandidate
  existingItems: ContextItem[]
  onEdit: (id: string, input: UpdateCandidateInput) => void
  onCommit: (id: string) => void
  onMerge: (id: string, contextItemId: string) => void
  onIgnore: (id: string) => void
  selected: boolean
  onToggleSelect: (id: string) => void
}

export default function CandidateCard({
  candidate,
  existingItems,
  onEdit,
  onCommit,
  onMerge,
  onIgnore,
  selected,
  onToggleSelect,
}: CandidateCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [term, setTerm] = useState(candidate.proposed_term)
  const [description, setDescription] = useState(candidate.proposed_description ?? '')
  const [category, setCategory] = useState(candidate.proposed_category ?? '')
  const [aliases, setAliases] = useState<string[]>(candidate.aliases)
  const [aliasDraft, setAliasDraft] = useState('')
  const [isMerging, setIsMerging] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState('')

  const startEdit = () => {
    setTerm(candidate.proposed_term)
    setDescription(candidate.proposed_description ?? '')
    setCategory(candidate.proposed_category ?? '')
    setAliases(candidate.aliases)
    setAliasDraft('')
    setIsEditing(true)
  }

  const addAlias = () => {
    const value = aliasDraft.trim()
    if (value && !aliases.includes(value)) setAliases([...aliases, value])
    setAliasDraft('')
  }

  const save = () => {
    setIsEditing(false)
    onEdit(candidate.id, {
      proposed_term: term.trim() || candidate.proposed_term,
      proposed_description: description,
      proposed_category: category,
      aliases,
    })
  }

  const confirmMerge = () => {
    if (!mergeTargetId) return
    onMerge(candidate.id, mergeTargetId)
    setIsMerging(false)
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(candidate.id)}
            aria-label={`Select ${candidate.proposed_term}`}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">{candidate.proposed_term}</span>
              {candidate.proposed_category && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                  {candidate.proposed_category}
                </span>
              )}
            </div>
            {candidate.proposed_description && !isEditing && (
              <p className="mt-1.5 text-sm text-ink-soft">{candidate.proposed_description}</p>
            )}
          </div>
        </div>

        {!isEditing && (
          <button type="button" onClick={startEdit} aria-label="Edit candidate" className={iconButtonClass}>
            <PencilIcon />
          </button>
        )}
      </div>

      {candidate.aliases.length > 0 && !isEditing && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {candidate.aliases.map((alias) => (
            <span key={alias} className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-ink-soft">
              {alias}
            </span>
          ))}
        </div>
      )}

      {isEditing ? (
        <div className="mt-3 flex flex-col gap-3">
          <TextField id={`cterm-${candidate.id}`} label="Term" value={term} onChange={(e) => setTerm(e.target.value)} />
          <TextField
            id={`ccategory-${candidate.id}`}
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <label className="block text-left">
            <span className="mb-1.5 block text-sm font-medium text-ink">Description</span>
            <textarea
              className="min-h-20 w-full rounded-xl border border-border bg-paper p-3 text-[16px] text-ink outline-none focus:border-brand-400"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Aliases</span>
            <div className="flex flex-wrap gap-1.5">
              {aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-xs text-ink-soft"
                >
                  {alias}
                  <button
                    type="button"
                    onClick={() => setAliases(aliases.filter((a) => a !== alias))}
                    aria-label={`Remove alias ${alias}`}
                    className="text-ink-soft hover:text-ink"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={aliasDraft}
                onChange={(e) => setAliasDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addAlias()
                  }
                }}
                placeholder="Add an alias, press Enter"
                className="w-full rounded-xl border border-border bg-paper px-3 py-2 text-[16px] text-ink outline-none focus:border-brand-400"
              />
              <Button type="button" variant="secondary" className="!px-3 !py-2 !text-sm" onClick={addAlias}>
                Add
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              className="!px-4 !py-2 !text-sm"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" className="!px-4 !py-2 !text-sm" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      ) : isMerging ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-paper p-3">
          <label className="block text-left text-sm font-medium text-ink">
            Merge into existing item
            <select
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-[16px] text-ink outline-none focus:border-brand-400"
            >
              <option value="">Choose an item…</option>
              {existingItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.term}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" className="!px-4 !py-2 !text-sm" onClick={() => setIsMerging(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="!px-4 !py-2 !text-sm"
              disabled={!mergeTargetId}
              onClick={confirmMerge}
            >
              Merge
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            className="!px-4 !py-2 !text-sm"
            onClick={() => onCommit(candidate.id)}
          >
            <CheckIcon /> Commit
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="!px-4 !py-2 !text-sm"
            onClick={() => setIsMerging(true)}
            disabled={existingItems.length === 0}
          >
            Merge into…
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="!px-4 !py-2 !text-sm"
            onClick={() => onIgnore(candidate.id)}
          >
            Ignore
          </Button>
        </div>
      )}
    </div>
  )
}
