import { useState } from 'react'
import Button from '../components/Button'
import TextField from '../components/TextField'
import Highlight from '../search/Highlight'
import type { ContextItem, UpdateContextItemInput } from '../api/context'

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

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2m-7 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const iconButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink transition-colors active:bg-border'
const dangerButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink transition-colors active:bg-red-500/15 active:text-red-500'

interface ContextItemCardProps {
  item: ContextItem
  onUpdate: (id: string, input: UpdateContextItemInput) => void
  onDelete: (id: string) => void
  selected: boolean
  onToggleSelect: (id: string) => void
  searchQuery: string
}

export default function ContextItemCard({
  item,
  onUpdate,
  onDelete,
  selected,
  onToggleSelect,
  searchQuery,
}: ContextItemCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [term, setTerm] = useState(item.term)
  const [description, setDescription] = useState(item.description ?? '')
  const [category, setCategory] = useState(item.category ?? '')
  const [alwaysInclude, setAlwaysInclude] = useState(item.always_include)
  const [aliases, setAliases] = useState<string[]>(item.aliases)
  const [aliasDraft, setAliasDraft] = useState('')

  const startEdit = () => {
    setTerm(item.term)
    setDescription(item.description ?? '')
    setCategory(item.category ?? '')
    setAlwaysInclude(item.always_include)
    setAliases(item.aliases)
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
    onUpdate(item.id, {
      term: term.trim() || item.term,
      description,
      category,
      always_include: alwaysInclude,
      aliases,
    })
  }

  const handleDelete = () => {
    if (window.confirm(`Delete "${item.term}" from your context? This can't be undone.`)) {
      onDelete(item.id)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            aria-label={`Select ${item.term}`}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">
                <Highlight text={item.term} query={searchQuery} />
              </span>
              {item.category && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                  <Highlight text={item.category} query={searchQuery} />
                </span>
              )}
              {item.always_include && (
                <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                  Always included
                </span>
              )}
            </div>
            {item.description && !isEditing && (
              <p className="mt-1.5 text-sm text-ink-soft">
                <Highlight text={item.description} query={searchQuery} />
              </p>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={startEdit} aria-label="Edit item" className={iconButtonClass}>
              <PencilIcon />
            </button>
            <button type="button" onClick={handleDelete} aria-label="Delete item" className={dangerButtonClass}>
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      {item.aliases.length > 0 && !isEditing && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.aliases.map((alias) => (
            <span key={alias} className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-ink-soft">
              <Highlight text={alias} query={searchQuery} />
            </span>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="mt-3 flex flex-col gap-3">
          <TextField id={`term-${item.id}`} label="Term" value={term} onChange={(e) => setTerm(e.target.value)} />
          <TextField
            id={`category-${item.id}`}
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. people, acronyms, companies"
          />
          <label className="block text-left">
            <span className="mb-1.5 block text-sm font-medium text-ink">Description</span>
            <textarea
              className="min-h-20 w-full rounded-xl border border-border bg-paper p-3 text-[16px] text-ink outline-none focus:border-brand-400"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={alwaysInclude}
              onChange={(e) => setAlwaysInclude(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            Always include in transcription context
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
      )}
    </div>
  )
}
