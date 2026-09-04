import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { MAX_AUDIO_BYTES, classifyForUpload, extensionOf, validateAudioFile } from './audioFileValidation'
import { probeDurationMs } from './audioUtils'
import { transcodeToCompressed } from './audioTranscode'

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
  const [isCompressing, setIsCompressing] = useState(false)

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setError('')
    const classification = classifyForUpload(file)

    if (classification === 'uncompressed' || classification === 'oversized-compressed') {
      setIsCompressing(true)
      try {
        const { blob, mimeType, durationMs } = await transcodeToCompressed(file)
        if (blob.size > MAX_AUDIO_BYTES) {
          setError(`Even compressed, that recording is too long to fit under the 24MB limit.`)
          return
        }
        onUpload(blob, mimeType, durationMs)
      } catch {
        // Compression isn't guaranteed everywhere (older browsers, unusual
        // codecs) — fall back to the plain rejection message rather than a
        // silent failure.
        setError(
          classification === 'uncompressed'
            ? `.${extensionOf(file.name)} files are uncompressed and aren't supported, and this browser couldn't ` +
                `compress it automatically — try mp3, m4a, or ogg instead.`
            : `That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — the limit is 24MB, and this browser ` +
                `couldn't compress it automatically.`,
        )
      } finally {
        setIsCompressing(false)
      }
      return
    }

    const validationError = validateAudioFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    const durationMs = await probeDurationMs(file)
    onUpload(file, file.type || 'audio/mpeg', durationMs)
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isCompressing}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors active:text-ink disabled:opacity-60"
      >
        {isCompressing ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-soft border-t-transparent" />
        ) : (
          <UploadIcon />
        )}
        {isCompressing ? 'Compressing your file…' : 'Upload an audio file'}
      </button>
      <input
        ref={inputRef}
        type="file"
        // iOS Safari's Files picker over-filters on the `audio/*` MIME
        // wildcard alone — it hides plenty of legitimate audio (m4a
        // included) that doesn't match whatever UTI it's checking against.
        // Listing every extension explicitly, accepted and transcodable
        // alike, works around that; our own JS validation is the real
        // gatekeeper regardless of what this lets through.
        accept="audio/*,.mp3,.m4a,.aac,.ogg,.webm,.opus,.3gp,.amr,.mp4,.caf,.wav,.aiff,.aif,.flac"
        onChange={handleChange}
        className="hidden"
      />
      {error && <p className="max-w-xs text-center text-xs text-red-500">{error}</p>}
    </div>
  )
}
