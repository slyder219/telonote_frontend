export type NoteStatus = 'uploading' | 'processing' | 'ready' | 'upload-error'

export interface ClientNote {
  id: string
  createdAt: string
  durationMs: number | null
  roughTranscript: string | null
  finalTranscript: string | null
  status: NoteStatus
  /** A local object URL for this note's audio — set once recorded/uploaded this session, or lazily after fetchAudioUrl. */
  localAudioUrl?: string
  uploadError?: string
  pendingUpload?: { blob: Blob; mimeType: string }
  isSavingEdit?: boolean
}
