import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { validateAudioFile } from './audioFileValidation'
import { probeDurationMs } from './audioUtils'

interface UploadAudioButtonProps {
  onUpload: (blob: Blob, mimeType: string, durationMs: number) => void
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function UploadAudioButton({ onUpload }: UploadAudioButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState('')

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file later
    if (!file) return

    const validationError = validateAudioFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    const durationMs = await probeDurationMs(file)
    onUpload(file, file.type || 'audio/mpeg', durationMs)
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors active:text-ink"
      >
        <UploadIcon />
        Upload an audio file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.3gp,.amr"
        onChange={handleChange}
        className="hidden"
      />
      {error && <p className="max-w-xs text-center text-xs text-red-500">{error}</p>}
    </div>
  )
}
