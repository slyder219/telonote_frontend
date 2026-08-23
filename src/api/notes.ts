import { apiFetch, apiFetchBlob } from './client'

export interface NoteSummary {
  id: string
  created_at: string
  duration_ms: number | null
  rough_transcript: string | null
  final_transcript: string | null
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
  return apiFetch<NoteDetail>('/notes', {
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
  return apiFetch<NoteDetail>(`/notes/${id}/retranscribe`, {
    method: 'POST',
    accessToken,
    withCredentials: false,
  })
}
