export type NoteStatus = 'uploading' | 'processing' | 'ready' | 'upload-error'

export interface ClientNote {
  id: string
  createdAt: string
  durationMs: number | null
  roughTranscript: string | null
  finalTranscript: string | null
  status: NoteStatus
  /** Only present for notes recorded in this browser session — the backend has no audio-playback endpoint yet. */
  localAudioUrl?: string
  uploadError?: string
  pendingUpload?: { blob: Blob; mimeType: string }
  isSavingEdit?: boolean
}
