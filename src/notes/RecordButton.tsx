import { useVoiceRecorder } from './useVoiceRecorder'
import { formatDuration } from './format'

interface RecordButtonProps {
  onComplete: (blob: Blob, mimeType: string, durationMs: number) => void
}

export default function RecordButton({ onComplete }: RecordButtonProps) {
  const { status, error, elapsedMs, start, stop, cancel, dismissError } = useVoiceRecorder()

  const isRecording = status === 'recording'
  const isRequesting = status === 'requesting'

  const handlePress = async () => {
    if (status === 'idle' || status === 'error') {
      await start()
    } else if (isRecording) {
      const result = await stop()
      if (result) onComplete(result.blob, result.mimeType, result.durationMs)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="flex items-center gap-4">
        {isRecording && (
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel recording"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink-soft transition-colors hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={handlePress}
          disabled={isRequesting}
          aria-label={isRecording ? 'Stop and send recording' : 'Start recording'}
          className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition-colors disabled:cursor-wait ${
            isRecording
              ? 'bg-red-500 shadow-red-500/30'
              : 'bg-brand-500 shadow-brand-500/30 hover:bg-brand-600'
          }`}
        >
          {isRecording && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/40" />
          )}
          {isRequesting ? (
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : isRecording ? (
            <span className="relative h-6 w-6 rounded-md bg-white" />
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="relative">
              <rect x="9" y="3" width="6" height="12" rx="3" fill="#fff" />
              <path d="M6 11a6 6 0 0 0 12 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 17v3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      <p className="text-sm text-ink-soft">
        {isRequesting && 'Requesting microphone access…'}
        {isRecording && formatDuration(elapsedMs)}
        {status === 'idle' && 'Tap to record a note'}
      </p>

      {error && (
        <div className="flex max-w-xs flex-col items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-500">
          <span>{error}</span>
          <button type="button" onClick={dismissError} className="text-xs font-medium underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
