import { apiFetch } from './client'

// Mirrors the backend's TranscriptFormat (app/settings/schemas.py). The server
// owns the defaults and always returns every field filled in.
export type FinalPeriod = 'as_transcribed' | 'always' | 'never'
export type Paragraphs = 'as_transcribed' | 'single_block'

export interface TranscriptFormat {
  final_period: FinalPeriod
  paragraphs: Paragraphs
}

/** note_format applies to regular notes, keyboard_format to Telonote keyboard dictations. */
export interface UserSettings {
  note_format: TranscriptFormat
  keyboard_format: TranscriptFormat
}

export type FormatScope = keyof UserSettings

export function getSettings(accessToken: string) {
  return apiFetch<UserSettings>('/settings', { accessToken, withCredentials: false })
}

/** Partial update: only the fields sent change. Returns the full settings. */
export function updateSettings(patch: Partial<Record<FormatScope, Partial<TranscriptFormat>>>, accessToken: string) {
  return apiFetch<UserSettings>('/settings', { method: 'PATCH', body: patch, accessToken, withCredentials: false })
}
