import type { NoteColor } from '../api/notes'

export type NoteStatus = 'uploading' | 'processing' | 'ready' | 'upload-error'

export interface ClientNote {
  id: string
  createdAt: string
  durationMs: number | null
  roughTranscript: string | null
  finalTranscript: string | null
  status: NoteStatus
  color: NoteColor | null
  completed: boolean
  /** A local object URL for this note's audio — set once recorded/uploaded this session, or lazily after fetchAudioUrl. */
  localAudioUrl?: string
  uploadError?: string
  pendingUpload?: { blob: Blob; mimeType: string }
  isSavingEdit?: boolean
}
