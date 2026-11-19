import { useEffect, useRef, useState } from 'react'
import * as settingsApi from '../api/settings'
import type { FormatScope, TranscriptFormat, UserSettings } from '../api/settings'
import { ApiError, NetworkError } from '../api/client'
import { useAuthenticatedRequest } from '../auth/useAuthenticatedRequest'

// Field labels and option wording. Order is the order shown.
const FIELDS: {
  key: keyof TranscriptFormat
  label: string
  options: { value: string; label: string }[]
}[] = [
  {
    key: 'final_period',
    label: 'Period at the end',
    options: [
      { value: 'as_transcribed', label: 'As transcribed' },
      { value: 'always', label: 'Always end with a period' },
      { value: 'never', label: 'Never end with a period' },
    ],
  },
  {
    key: 'paragraphs',
    label: 'Line breaks',
    options: [
      { value: 'as_transcribed', label: 'As transcribed' },
      { value: 'single_block', label: 'One block of text' },
    ],
  },
]

const SCOPES: { scope: FormatScope; title: string }[] = [
  { scope: 'note_format', title: 'Notes' },
  { scope: 'keyboard_format', title: 'Keyboard dictation' },
]

// How finished transcripts are tidied: separately for notes and for the iOS
// keyboard. Each change saves on its own; applies to new transcriptions only.
export default function TranscriptFormatCard() {
  const callWithAuthRetry = useAuthenticatedRequest()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [error, setError] = useState('')
  // callWithAuthRetry changes identity on every token refresh; load only once.
  const startedLoading = useRef(false)

  useEffect(() => {
    if (startedLoading.current) return
    startedLoading.current = true
    callWithAuthRetry((token) => settingsApi.getSettings(token))
      .then(setSettings)
      .catch(() => setError("Couldn't load your settings. Refresh to try again."))
  }, [callWithAuthRetry])

  const change = async (scope: FormatScope, key: keyof TranscriptFormat, value: string) => {
    if (!settings) return
    const previous = settings
    setError('')
    setSettings({ ...settings, [scope]: { ...settings[scope], [key]: value } })
    try {
      setSettings(await callWithAuthRetry((token) => settingsApi.updateSettings({ [scope]: { [key]: value } }, token)))
    } catch (err) {
      setSettings(previous)
      setError(
        err instanceof ApiError || err instanceof NetworkError ? err.message : "Couldn't save. Please try again.",
      )
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-base font-semibold text-ink">Transcript formatting</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Tidies punctuation and spacing after transcription — it never changes your words. Applies to new
        recordings and re-transcriptions.
      </p>

      {settings ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {SCOPES.map(({ scope, title }) => (
            <div key={scope} className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-ink">{title}</h3>
              {FIELDS.map((field) => (
                <label key={field.key} className="block text-left text-sm font-medium text-ink">
                  {field.label}
                  <select
                    value={settings[scope][field.key]}
                    onChange={(e) => void change(scope, field.key, e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-[16px] text-ink outline-none focus:border-brand-400"
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ))}
        </div>
      ) : (
        !error && <p className="mt-6 text-sm text-ink-soft">Loading…</p>
      )}

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </div>
  )
}
