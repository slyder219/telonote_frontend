import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthenticatedRequest } from '../auth/useAuthenticatedRequest'
import * as notesApi from '../api/notes'
import type { NoteColor, NoteDetail, NoteSummary } from '../api/notes'
import { ApiError, NetworkError } from '../api/client'
import type { QuotaInfo } from '../api/client'
import { downloadTextFile, exportFilename, filenameForUpload, formatNotesForExport } from './format'
import type { ExportFormat } from './format'
import { MAX_AUDIO_BYTES } from './audioFileValidation'
import type { ClientNote } from './types'

const POLL_INTERVAL_MS = 4000
const MAX_POLL_ATTEMPTS = 15
const BANNER_TIMEOUT_MS = 5000
const PAGE_SIZE = 100

function detailIsUnprocessed(note: NoteDetail) {
  return note.rough_transcript === null && note.final_transcript === null
}

export function toClientNote(summary: NoteSummary): ClientNote {
  return {
    id: summary.id,
    createdAt: summary.created_at,
    durationMs: summary.duration_ms,
    roughTranscript: summary.rough_transcript,
    finalTranscript: summary.final_transcript,
    status: 'ready',
    color: summary.color,
    completed: summary.completed,
  }
}

export function useNotes() {
  const callWithAuthRetry = useAuthenticatedRequest()
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bannerMessage, setBannerMessage] = useState<string | null>(null)
  const [quota, setQuota] = useState<QuotaInfo | null>(null)

  const nextOffsetRef = useRef(0)
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
      .current((token) => notesApi.listNotes(token, { limit: PAGE_SIZE, offset: 0 }))
      .then((summaries) => {
        if (cancelled) return
        setNotes(summaries.map(toClientNote))
        nextOffsetRef.current = summaries.length
        setHasMore(summaries.length === PAGE_SIZE)
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

  // Best-effort — a persistent quota indicator is a nice-to-have, so a
  // failure here (e.g. offline on load) just means no ring until the next
  // successful upload/retranscribe naturally supplies quota headers.
  useEffect(() => {
    let cancelled = false
    callWithAuthRetryRef
      .current((token) => notesApi.getUsage(token))
      .then((usage) => {
        if (cancelled) return
        setQuota({
          limitBytes: usage.limit_bytes,
          usedBytes: usage.used_bytes,
          remainingBytes: usage.remaining_bytes,
          resetsAt: usage.resets_at,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const summaries = await callWithAuthRetry((token) =>
        notesApi.listNotes(token, { limit: PAGE_SIZE, offset: nextOffsetRef.current }),
      )
      setNotes((current) => [...current, ...summaries.map(toClientNote)])
      nextOffsetRef.current += summaries.length
      setHasMore(summaries.length === PAGE_SIZE)
    } catch (error) {
      showBanner(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load more notes.',
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, callWithAuthRetry, showBanner])

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
        color: null,
        completed: false,
        localAudioUrl: localUrl,
      }
      setNotes((current) => [optimisticNote, ...current])

      if (blob.size > MAX_AUDIO_BYTES) {
        setNotes((current) =>
          current.map((note) =>
            note.id === tempId
              ? {
                  ...note,
                  status: 'upload-error',
                  uploadError: `That recording is ${(blob.size / (1024 * 1024)).toFixed(1)}MB — the limit is 24MB.`,
                  pendingUpload: { blob, mimeType },
                }
              : note,
          ),
        )
        return
      }

      try {
        const { data: created, quota: quotaInfo } = await callWithAuthRetry((token) =>
          notesApi.createNote(blob, filenameForUpload(blob, mimeType), token),
        )
        if (quotaInfo) setQuota(quotaInfo)
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
                  color: created.color,
                  completed: created.completed,
                  localAudioUrl: localUrl,
                }
              : note,
          ),
        )
        if (unprocessed) schedulePoll(created.id, 0)
      } catch (error) {
        if (error instanceof ApiError && error.quota) setQuota(error.quota)
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
      callWithAuthRetry((token) => notesApi.createNote(blob, filenameForUpload(blob, mimeType), token))
        .then(({ data: created, quota: quotaInfo }) => {
          if (quotaInfo) setQuota(quotaInfo)
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
                    color: created.color,
                    completed: created.completed,
                    localAudioUrl: localUrl,
                  }
                : n,
            ),
          )
          if (unprocessed) schedulePoll(created.id, 0)
        })
        .catch((error) => {
          if (error instanceof ApiError && error.quota) setQuota(error.quota)
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

  const updateNoteColor = useCallback(
    async (id: string, color: NoteColor | null) => {
      let previous: NoteColor | null = null
      setNotes((current) =>
        current.map((note) => {
          if (note.id !== id) return note
          previous = note.color
          return { ...note, color }
        }),
      )

      try {
        const updated = await callWithAuthRetry((token) =>
          notesApi.updateNoteAppearance(id, { color }, token),
        )
        setNotes((current) =>
          current.map((note) => (note.id === id ? { ...note, color: updated.color } : note)),
        )
      } catch {
        setNotes((current) =>
          current.map((note) => (note.id === id ? { ...note, color: previous } : note)),
        )
        showBanner("Couldn't update note color — reverted.")
      }
    },
    [callWithAuthRetry, showBanner],
  )

  const toggleNoteCompleted = useCallback(
    async (id: string) => {
      const target = notes.find((note) => note.id === id)
      if (!target) return
      const previous = target.completed
      const next = !previous
      setNotes((current) => current.map((note) => (note.id === id ? { ...note, completed: next } : note)))

      try {
        const updated = await callWithAuthRetry((token) =>
          notesApi.updateNoteAppearance(id, { completed: next }, token),
        )
        setNotes((current) =>
          current.map((note) => (note.id === id ? { ...note, completed: updated.completed } : note)),
        )
      } catch {
        setNotes((current) =>
          current.map((note) => (note.id === id ? { ...note, completed: previous } : note)),
        )
        showBanner("Couldn't update note — reverted.")
      }
    },
    [notes, callWithAuthRetry, showBanner],
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

  const bulkDeleteNotes = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return
      ids.forEach(clearPoll)
      const idSet = new Set(ids)
      let removed: { index: number; note: ClientNote }[] = []
      setNotes((current) => {
        removed = current.map((note, index) => ({ index, note })).filter(({ note }) => idSet.has(note.id))
        return current.filter((note) => !idSet.has(note.id))
      })

      const results = await Promise.allSettled(
        ids.map((id) => callWithAuthRetry((token) => notesApi.deleteNote(id, token))),
      )
      const failedIds = new Set(ids.filter((_, i) => results[i].status === 'rejected'))
      ids
        .filter((id) => !failedIds.has(id))
        .forEach((id) => {
          const url = localAudioUrls.current.get(id)
          if (url) {
            URL.revokeObjectURL(url)
            localAudioUrls.current.delete(id)
          }
        })
      if (failedIds.size > 0) {
        setNotes((current) => {
          const next = [...current]
          removed
            .filter(({ note }) => failedIds.has(note.id))
            .forEach(({ index, note }) => next.splice(Math.min(index, next.length), 0, note))
          return next
        })
        const succeeded = ids.length - failedIds.size
        showBanner(
          succeeded > 0
            ? `Deleted ${succeeded}, ${failedIds.size} failed.`
            : `Couldn't delete ${failedIds.size === 1 ? 'that note' : 'those notes'}.`,
        )
      }
    },
    [callWithAuthRetry, showBanner],
  )

  const retranscribeNote = useCallback(
    async (id: string) => {
      let previousStatus: ClientNote['status'] | undefined
      setNotes((current) =>
        current.map((note) => {
          if (note.id !== id) return note
          previousStatus = note.status
          return { ...note, status: 'processing' }
        }),
      )

      try {
        const { data: updated, quota: quotaInfo } = await callWithAuthRetry((token) =>
          notesApi.retranscribeNote(id, token),
        )
        if (quotaInfo) setQuota(quotaInfo)
        const unprocessed = detailIsUnprocessed(updated)
        setNotes((current) =>
          current.map((note) =>
            note.id === id
              ? {
                  ...note,
                  durationMs: updated.duration_ms ?? note.durationMs,
                  roughTranscript: updated.rough_transcript,
                  finalTranscript: updated.final_transcript,
                  status: unprocessed ? 'processing' : 'ready',
                }
              : note,
          ),
        )
        if (unprocessed) schedulePoll(id, 0)
      } catch (error) {
        if (error instanceof ApiError && error.quota) setQuota(error.quota)
        setNotes((current) =>
          current.map((note) =>
            note.id === id ? { ...note, status: previousStatus ?? 'ready' } : note,
          ),
        )
        showBanner(
          error instanceof ApiError || error instanceof NetworkError
            ? error.message
            : "Couldn't re-run transcription.",
        )
      }
    },
    [callWithAuthRetry, schedulePoll, showBanner],
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

  // Semantic ("by meaning") search returns bare {id, distance} pairs, not
  // full note data — the caller intersects these ids against the already-
  // loaded `notes` list and reuses that data, rather than this hook fetching
  // or caching a second, parallel copy of note content.
  const searchByMeaning = useCallback(
    (query: string, limit = 10) => callWithAuthRetry((token) => notesApi.searchNotesByMeaning(query, token, limit)),
    [callWithAuthRetry],
  )

  const [isExporting, setIsExporting] = useState(false)

  // Exports the user's whole history, not just whatever's been paginated
  // into `notes` so far — loops /notes to completion independently of the
  // main list's own pagination state.
  const exportAllNotes = useCallback(async (format: ExportFormat) => {
    setIsExporting(true)
    try {
      const all: NoteSummary[] = []
      let offset = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const page = await callWithAuthRetry((token) => notesApi.listNotes(token, { limit: PAGE_SIZE, offset }))
        all.push(...page)
        if (page.length < PAGE_SIZE) break
        offset += page.length
      }
      const text = formatNotesForExport(
        all.map((note) => ({
          id: note.id,
          createdAt: note.created_at,
          durationMs: note.duration_ms,
          transcript: note.final_transcript ?? note.rough_transcript,
        })),
        format,
      )
      downloadTextFile(exportFilename(format), text, format)
      showBanner(`Exported ${all.length} note${all.length === 1 ? '' : 's'}.`)
    } catch (error) {
      showBanner(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : "Couldn't export your notes.",
      )
    } finally {
      setIsExporting(false)
    }
  }, [callWithAuthRetry, showBanner])

  return {
    notes,
    isLoadingInitial,
    isLoadingMore,
    hasMore,
    loadMore,
    loadError,
    bannerMessage,
    dismissBanner,
    uploadRecording,
    retryUpload,
    discardUpload,
    editTranscript,
    updateNoteColor,
    toggleNoteCompleted,
    deleteNoteById,
    bulkDeleteNotes,
    retranscribeNote,
    fetchAudioUrl,
    searchByMeaning,
    exportAllNotes,
    isExporting,
    quota,
  }
}
