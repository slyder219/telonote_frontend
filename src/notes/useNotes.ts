import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthenticatedRequest } from '../auth/useAuthenticatedRequest'
import * as notesApi from '../api/notes'
import type { NoteDetail } from '../api/notes'
import { ApiError, NetworkError } from '../api/client'
import { filenameForMimeType } from './format'
import type { ClientNote } from './types'

const POLL_INTERVAL_MS = 4000
const MAX_POLL_ATTEMPTS = 15
const BANNER_TIMEOUT_MS = 5000

function detailIsUnprocessed(note: NoteDetail) {
  return note.rough_transcript === null && note.final_transcript === null
}

export function useNotes() {
  const callWithAuthRetry = useAuthenticatedRequest()
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bannerMessage, setBannerMessage] = useState<string | null>(null)

  const localAudioUrls = useRef(new Map<string, string>())
  const bannerTimer = useRef<number | null>(null)
  const pollTimers = useRef(new Map<string, number>())

  const showBanner = useCallback((message: string) => {
    setBannerMessage(message)
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current)
    bannerTimer.current = window.setTimeout(() => setBannerMessage(null), BANNER_TIMEOUT_MS)
  }, [])

  const dismissBanner = useCallback(() => {
    setBannerMessage(null)
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current)
  }, [])

  const clearPoll = (id: string) => {
    const timer = pollTimers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      pollTimers.current.delete(id)
    }
  }

  const schedulePoll = useCallback(
    function schedulePollImpl(id: string, attempt: number) {
      clearPoll(id)
      const timer = window.setTimeout(async () => {
        pollTimers.current.delete(id)
        try {
          const fresh = await callWithAuthRetry((token) => notesApi.getNote(id, token))
          const stillUnprocessed = detailIsUnprocessed(fresh)
          const resolved = !stillUnprocessed || attempt + 1 >= MAX_POLL_ATTEMPTS
          setNotes((current) =>
            current.map((note) =>
              note.id === id
                ? {
                    ...note,
                    durationMs: fresh.duration_ms ?? note.durationMs,
                    roughTranscript: fresh.rough_transcript,
                    finalTranscript: fresh.final_transcript,
                    status: resolved ? 'ready' : 'processing',
                  }
                : note,
            ),
          )
          // A note that's been deleted in the meantime already had its poll
          // timer cleared by deleteNoteById, so it's safe to always continue
          // here purely based on the fetch result.
          if (!resolved) schedulePollImpl(id, attempt + 1)
        } catch {
          // Give up quietly — the note just settles into its current (empty) state.
          setNotes((current) =>
            current.map((note) => (note.id === id ? { ...note, status: 'ready' } : note)),
          )
        }
      }, POLL_INTERVAL_MS)
      pollTimers.current.set(id, timer)
    },
    [callWithAuthRetry],
  )

  // Keeps the latest auth-aware caller available to the mount-only effect
  // below without making that effect re-run (and re-fetch everything) every
  // time the access token silently refreshes in the background.
  const callWithAuthRetryRef = useRef(callWithAuthRetry)
  useEffect(() => {
    callWithAuthRetryRef.current = callWithAuthRetry
  }, [callWithAuthRetry])

  useEffect(() => {
    let cancelled = false
    callWithAuthRetryRef
      .current((token) => notesApi.listNotes(token, { limit: 100 }))
      .then((summaries) => {
        if (cancelled) return
        setNotes(
          summaries.map((summary) => ({
            id: summary.id,
            createdAt: summary.created_at,
            durationMs: summary.duration_ms,
            roughTranscript: summary.rough_transcript,
            finalTranscript: summary.final_transcript,
            status: 'ready',
          })),
        )
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(
          error instanceof ApiError || error instanceof NetworkError
            ? error.message
            : 'Could not load your notes.',
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInitial(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const urls = localAudioUrls.current
    const timers = pollTimers.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const uploadRecording = useCallback(
    async (blob: Blob, mimeType: string, localDurationMs: number) => {
      const tempId = `temp-${crypto.randomUUID()}`
      const localUrl = URL.createObjectURL(blob)
      localAudioUrls.current.set(tempId, localUrl)

      const optimisticNote: ClientNote = {
        id: tempId,
        createdAt: new Date().toISOString(),
        durationMs: localDurationMs,
        roughTranscript: null,
        finalTranscript: null,
        status: 'uploading',
        localAudioUrl: localUrl,
      }
      setNotes((current) => [optimisticNote, ...current])

      try {
        const created = await callWithAuthRetry((token) =>
          notesApi.createNote(blob, filenameForMimeType(mimeType), token),
        )
        localAudioUrls.current.delete(tempId)
        localAudioUrls.current.set(created.id, localUrl)
        const unprocessed = detailIsUnprocessed(created)
        setNotes((current) =>
          current.map((note) =>
            note.id === tempId
              ? {
                  id: created.id,
                  createdAt: created.created_at,
                  durationMs: created.duration_ms ?? localDurationMs,
                  roughTranscript: created.rough_transcript,
                  finalTranscript: created.final_transcript,
                  status: unprocessed ? 'processing' : 'ready',
                  localAudioUrl: localUrl,
                }
              : note,
          ),
        )
        if (unprocessed) schedulePoll(created.id, 0)
      } catch (error) {
        const message =
          error instanceof ApiError || error instanceof NetworkError
            ? error.message
            : 'Upload failed.'
        setNotes((current) =>
          current.map((note) =>
            note.id === tempId
              ? { ...note, status: 'upload-error', uploadError: message, pendingUpload: { blob, mimeType } }
              : note,
          ),
        )
      }
    },
    [callWithAuthRetry, schedulePoll],
  )

  const retryUpload = useCallback(
    (id: string) => {
      const note = notes.find((n) => n.id === id)
      if (!note?.pendingUpload) return
      const { blob, mimeType } = note.pendingUpload
      setNotes((current) =>
        current.map((n) => (n.id === id ? { ...n, status: 'uploading', uploadError: undefined } : n)),
      )
      callWithAuthRetry((token) => notesApi.createNote(blob, filenameForMimeType(mimeType), token))
        .then((created) => {
          const localUrl = localAudioUrls.current.get(id)
          if (localUrl) {
            localAudioUrls.current.delete(id)
            localAudioUrls.current.set(created.id, localUrl)
          }
          const unprocessed = detailIsUnprocessed(created)
          setNotes((current) =>
            current.map((n) =>
              n.id === id
                ? {
                    id: created.id,
                    createdAt: created.created_at,
                    durationMs: created.duration_ms ?? n.durationMs,
                    roughTranscript: created.rough_transcript,
                    finalTranscript: created.final_transcript,
                    status: unprocessed ? 'processing' : 'ready',
                    localAudioUrl: localUrl,
                  }
                : n,
            ),
          )
          if (unprocessed) schedulePoll(created.id, 0)
        })
        .catch((error) => {
          const message =
            error instanceof ApiError || error instanceof NetworkError
              ? error.message
              : 'Upload failed.'
          setNotes((current) =>
            current.map((n) =>
              n.id === id ? { ...n, status: 'upload-error', uploadError: message } : n,
            ),
          )
        })
    },
    [notes, callWithAuthRetry, schedulePoll],
  )

  const discardUpload = useCallback((id: string) => {
    const url = localAudioUrls.current.get(id)
    if (url) {
      URL.revokeObjectURL(url)
      localAudioUrls.current.delete(id)
    }
    setNotes((current) => current.filter((note) => note.id !== id))
  }, [])

  const editTranscript = useCallback(
    async (id: string, newText: string) => {
      let previousText: string | null = null
      setNotes((current) =>
        current.map((note) => {
          if (note.id !== id) return note
          previousText = note.finalTranscript
          return { ...note, finalTranscript: newText, isSavingEdit: true }
        }),
      )

      try {
        const updated = await callWithAuthRetry((token) =>
          notesApi.updateNoteTranscript(id, newText, token),
        )
        setNotes((current) =>
          current.map((note) =>
            note.id === id
              ? { ...note, finalTranscript: updated.final_transcript, isSavingEdit: false }
              : note,
          ),
        )
      } catch {
        setNotes((current) =>
          current.map((note) =>
            note.id === id ? { ...note, finalTranscript: previousText, isSavingEdit: false } : note,
          ),
        )
        showBanner("Couldn't save your edit — reverted.")
      }
    },
    [callWithAuthRetry, showBanner],
  )

  const deleteNoteById = useCallback(
    async (id: string) => {
      clearPoll(id)
      let removedNote: ClientNote | undefined
      let removedIndex = -1
      setNotes((current) => {
        removedIndex = current.findIndex((note) => note.id === id)
        removedNote = current[removedIndex]
        return current.filter((note) => note.id !== id)
      })

      try {
        await callWithAuthRetry((token) => notesApi.deleteNote(id, token))
        const url = localAudioUrls.current.get(id)
        if (url) {
          URL.revokeObjectURL(url)
          localAudioUrls.current.delete(id)
        }
      } catch {
        setNotes((current) => {
          if (!removedNote) return current
          const next = [...current]
          next.splice(Math.min(removedIndex, next.length), 0, removedNote)
          return next
        })
        showBanner("Couldn't delete that note — it's back.")
      }
    },
    [callWithAuthRetry, showBanner],
  )

  // Lazily fetches and caches the audio for a note that wasn't recorded in
  // this session (no blob already in memory) — see GET /notes/{id}/audio.
  // Bearer-token auth means a plain <audio src> can't be used; the fetched
  // bytes get turned into an object URL instead.
  const fetchAudioUrl = useCallback(
    async (id: string) => {
      const cached = localAudioUrls.current.get(id)
      if (cached) return cached

      const blob = await callWithAuthRetry((token) => notesApi.getNoteAudio(id, token))
      const url = URL.createObjectURL(blob)
      localAudioUrls.current.set(id, url)
      setNotes((current) => current.map((note) => (note.id === id ? { ...note, localAudioUrl: url } : note)))
      return url
    },
    [callWithAuthRetry],
  )

  return {
    notes,
    isLoadingInitial,
    loadError,
    bannerMessage,
    dismissBanner,
    uploadRecording,
    retryUpload,
    discardUpload,
    editTranscript,
    deleteNoteById,
    fetchAudioUrl,
  }
}
