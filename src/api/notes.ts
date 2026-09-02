import { apiFetch, apiFetchBlob, apiFetchWithQuota } from './client'

export type NoteColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink'
export const NOTE_COLORS: NoteColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']

export interface NoteSummary {
  id: string
  created_at: string
  duration_ms: number | null
  rough_transcript: string | null
  final_transcript: string | null
  color: NoteColor | null
  completed: boolean
}

export interface NoteDetail extends NoteSummary {
  updated_at: string
  rough_transcription_model: string | null
  final_transcription_model: string | null
  rough_transcription_ms: number | null
  final_transcription_ms: number | null
  total_processing_ms: number | null
  audio_mime_type: string
  audio_size_bytes: number
}

export function listNotes(accessToken: string, options: { limit?: number; offset?: number } = {}) {
  const params = new URLSearchParams()
  if (options.limit) params.set('limit', String(options.limit))
  if (options.offset) params.set('offset', String(options.offset))
  const query = params.toString()
  return apiFetch<NoteSummary[]>(`/notes${query ? `?${query}` : ''}`, {
    accessToken,
    withCredentials: false,
  })
}

export function getNote(id: string, accessToken: string) {
  return apiFetch<NoteDetail>(`/notes/${id}`, { accessToken, withCredentials: false })
}

export function createNote(audio: Blob, filename: string, accessToken: string) {
  const formData = new FormData()
  formData.append('audio', audio, filename)
  return apiFetchWithQuota<NoteDetail>('/notes', {
    method: 'POST',
    body: formData,
    accessToken,
    withCredentials: false,
  })
}

export function updateNoteTranscript(id: string, finalTranscript: string, accessToken: string) {
  return apiFetch<NoteDetail>(`/notes/${id}`, {
    method: 'PATCH',
    body: { final_transcript: finalTranscript },
    accessToken,
    withCredentials: false,
  })
}

/** Partial update — only send the field(s) actually changing. */
export function updateNoteAppearance(
  id: string,
  updates: { color?: NoteColor | null; completed?: boolean },
  accessToken: string,
) {
  return apiFetch<NoteDetail>(`/notes/${id}/appearance`, {
    method: 'PATCH',
    body: updates,
    accessToken,
    withCredentials: false,
  })
}

export function deleteNote(id: string, accessToken: string) {
  return apiFetch<void>(`/notes/${id}`, {
    method: 'DELETE',
    accessToken,
    withCredentials: false,
  })
}

export function getNoteAudio(id: string, accessToken: string) {
  return apiFetchBlob(`/notes/${id}/audio`, { accessToken, withCredentials: false })
}

// Re-runs the full pipeline against the note's stored audio and overwrites
// its transcript/model/timing fields. Synchronous — same latency profile as
// POST /notes.
export function retranscribeNote(id: string, accessToken: string) {
  return apiFetchWithQuota<NoteDetail>(`/notes/${id}/retranscribe`, {
    method: 'POST',
    accessToken,
    withCredentials: false,
  })
}

export interface UsageInfo {
  limit_bytes: number
  used_bytes: number
  remaining_bytes: number
  resets_at: string
}

export function getUsage(accessToken: string) {
  return apiFetch<UsageInfo>('/notes/usage', { accessToken, withCredentials: false })
}

export interface NoteSearchResult {
  id: string
  distance: number
}

/** Semantic search over the caller's notes by meaning (pgvector cosine distance), ranked closest-first. Returns bare id/distance pairs — not full note data. */
export function searchNotesByMeaning(query: string, accessToken: string, limit = 10) {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  return apiFetch<NoteSearchResult[]>(`/notes/search?${params.toString()}`, {
    accessToken,
    withCredentials: false,
  })
}
