import { useState } from 'react'
import Button from '../components/Button'
import TextField from '../components/TextField'
import type { CreateContextItemInput } from '../api/context'

interface AddItemFormProps {
  onAdd: (input: CreateContextItemInput) => void
}

export default function AddItemForm({ onAdd }: AddItemFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [alwaysInclude, setAlwaysInclude] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setTerm('')
    setDescription('')
    setCategory('')
    setAlwaysInclude(false)
    setError('')
  }

  const handleAdd = () => {
    if (!term.trim()) {
      setError('Enter a term.')
      return
    }
    onAdd({
      term: term.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      always_include: alwaysInclude,
    })
    reset()
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="secondary" fullWidth onClick={() => setIsOpen(true)}>
        + Add context item
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <TextField
        id="new-term"
        label="Term"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        error={error}
        placeholder="e.g. Aetherworks Logistics"
        autoFocus
      />
      <TextField
        id="new-category"
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
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          className="!px-4 !py-2 !text-sm"
          onClick={() => {
            reset()
            setIsOpen(false)
          }}
        >
          Cancel
        </Button>
        <Button type="button" variant="primary" className="!px-4 !py-2 !text-sm" onClick={handleAdd}>
          Add
        </Button>
      </div>
    </div>
  )
}
