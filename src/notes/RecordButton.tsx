import { useVoiceRecorder } from './useVoiceRecorder'
import { formatDuration, formatResetTime } from './format'
import QuotaRing from './QuotaRing'
import type { QuotaInfo } from '../api/client'

const WARNING_THRESHOLD = 0.2 // show the ring once 20% or less of today's quota remains
const RING_SIZE = 108

interface RecordButtonProps {
  onComplete: (blob: Blob, mimeType: string, durationMs: number) => void
  quota: QuotaInfo | null
}

export default function RecordButton({ onComplete, quota }: RecordButtonProps) {
  const { status, error, elapsedMs, start, stop, cancel, dismissError } = useVoiceRecorder()

  const isRecording = status === 'recording'
  const isRequesting = status === 'requesting'

  const percentRemaining = quota ? quota.remainingBytes / quota.limitBytes : 1
  const showQuotaWarning = quota !== null && percentRemaining <= WARNING_THRESHOLD
  const isExhausted = quota !== null && quota.remainingBytes <= 0
  const percentRemainingLabel = Math.round(Math.max(0, percentRemaining) * 100)

  const handlePress = async () => {
    if (status === 'idle' || status === 'error') {
      if (isExhausted) return
      await start()
    } else if (isRecording) {
      const result = await stop()
      if (result) onComplete(result.blob, result.mimeType, result.durationMs)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      {/* Fixed side columns keep the main button visually centered whether
          or not the cancel button is present, instead of a flex row that
          shifts everything right when it appears. */}
      <div className="grid w-full max-w-xs grid-cols-[48px_1fr_48px] items-center">
        <div className="flex justify-center">
          {isRecording && (
            <button
              type="button"
              onClick={cancel}
              aria-label="Cancel recording"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink transition-colors active:bg-paper"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="relative flex items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
          {showQuotaWarning && <QuotaRing percentRemaining={percentRemaining} size={RING_SIZE} />}
          <button
            type="button"
            onClick={handlePress}
            disabled={isRequesting || (isExhausted && !isRecording)}
            aria-label={isRecording ? 'Stop and send recording' : 'Start recording'}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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
      </div>

      <p className="text-sm text-ink-soft">
        {isRequesting && 'Requesting microphone access…'}
        {isRecording && formatDuration(elapsedMs)}
        {!isRequesting && !isRecording && (isExhausted ? null : 'Tap to record a note')}
      </p>

      {!isRecording && !isRequesting && quota && isExhausted && (
        <p className="max-w-xs text-center text-sm text-red-500">
          Daily limit reached. Resets at {formatResetTime(quota.resetsAt)}.
        </p>
      )}
      {!isRecording && !isRequesting && quota && showQuotaWarning && !isExhausted && (
        <p className="max-w-xs text-center text-sm text-amber-500">
          {percentRemainingLabel}% of today's limit left.
        </p>
      )}

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
