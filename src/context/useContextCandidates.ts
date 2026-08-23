import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthenticatedRequest } from '../auth/useAuthenticatedRequest'
import * as contextApi from '../api/context'
import type { ContextCandidate, UpdateCandidateInput } from '../api/context'
import { ApiError, NetworkError } from '../api/client'

const BANNER_TIMEOUT_MS = 5000

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError || error instanceof NetworkError ? error.message : fallback
}

export function useContextCandidates() {
  const callWithAuthRetry = useAuthenticatedRequest()
  const [candidates, setCandidates] = useState<ContextCandidate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bannerMessage, setBannerMessage] = useState<string | null>(null)
  const bannerTimer = useRef<number | null>(null)

  const showBanner = useCallback((message: string) => {
    setBannerMessage(message)
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current)
    bannerTimer.current = window.setTimeout(() => setBannerMessage(null), BANNER_TIMEOUT_MS)
  }, [])

  const dismissBanner = useCallback(() => {
    setBannerMessage(null)
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current)
  }, [])

  const callRef = useRef(callWithAuthRetry)
  useEffect(() => {
    callRef.current = callWithAuthRetry
  }, [callWithAuthRetry])

  useEffect(() => {
    let cancelled = false
    callRef
      .current((token) => contextApi.listCandidates(token, 'pending'))
      .then((list) => {
        if (!cancelled) setCandidates(list)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error, 'Could not load context candidates.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const editCandidate = useCallback(
    async (id: string, input: UpdateCandidateInput) => {
      let previous: ContextCandidate | undefined
      setCandidates((current) =>
        current.map((candidate) => {
          if (candidate.id !== id) return candidate
          previous = candidate
          return { ...candidate, ...input }
        }),
      )

      try {
        const updated = await callWithAuthRetry((token) => contextApi.updateCandidate(id, input, token))
        setCandidates((current) => current.map((candidate) => (candidate.id === id ? updated : candidate)))
      } catch (error) {
        setCandidates((current) =>
          current.map((candidate) => (candidate.id === id && previous ? previous : candidate)),
        )
        showBanner(errorMessage(error, "Couldn't save that edit."))
      }
    },
    [callWithAuthRetry, showBanner],
  )

  // Commit/merge/ignore all share the same shape: optimistically drop the
  // candidate from the pending queue, run the action, and put it back with
  // an error banner if the action didn't actually go through.
  const resolveCandidate = useCallback(
    async (id: string, action: () => Promise<ContextCandidate>, failureMessage: string) => {
      let removed: ContextCandidate | undefined
      let removedIndex = -1
      setCandidates((current) => {
        removedIndex = current.findIndex((candidate) => candidate.id === id)
        removed = current[removedIndex]
        return current.filter((candidate) => candidate.id !== id)
      })

      try {
        await action()
      } catch (error) {
        setCandidates((current) => {
          if (!removed) return current
          const next = [...current]
          next.splice(Math.min(removedIndex, next.length), 0, removed)
          return next
        })
        showBanner(errorMessage(error, failureMessage))
      }
    },
    [showBanner],
  )

  const commit = useCallback(
    (id: string) =>
      resolveCandidate(
        id,
        () => callWithAuthRetry((token) => contextApi.commitCandidate(id, token)),
        "Couldn't commit that candidate — it's back.",
      ),
    [resolveCandidate, callWithAuthRetry],
  )

  const merge = useCallback(
    (id: string, contextItemId: string) =>
      resolveCandidate(
        id,
        () => callWithAuthRetry((token) => contextApi.mergeCandidate(id, contextItemId, token)),
        "Couldn't merge that candidate — it's back.",
      ),
    [resolveCandidate, callWithAuthRetry],
  )

  const ignore = useCallback(
    (id: string) =>
      resolveCandidate(
        id,
        () => callWithAuthRetry((token) => contextApi.ignoreCandidate(id, token)),
        "Couldn't ignore that candidate — it's back.",
      ),
    [resolveCandidate, callWithAuthRetry],
  )

  const bulkResolve = useCallback(
    async (ids: string[], action: 'commit' | 'ignore') => {
      if (ids.length === 0) return
      const idSet = new Set(ids)
      let removed: { index: number; candidate: ContextCandidate }[] = []
      setCandidates((current) => {
        removed = current
          .map((candidate, index) => ({ index, candidate }))
          .filter(({ candidate }) => idSet.has(candidate.id))
        return current.filter((candidate) => !idSet.has(candidate.id))
      })

      try {
        const results = await callWithAuthRetry((token) => contextApi.bulkResolveCandidates(ids, action, token))
        const failed = results.filter((r) => !r.ok)
        if (failed.length > 0) {
          const failedIds = new Set(failed.map((r) => r.id))
          setCandidates((current) => {
            const next = [...current]
            removed
              .filter(({ candidate }) => failedIds.has(candidate.id))
              .forEach(({ index, candidate }) => next.splice(Math.min(index, next.length), 0, candidate))
            return next
          })
          const succeededCount = results.length - failed.length
          showBanner(
            succeededCount > 0
              ? `${succeededCount} ${action === 'commit' ? 'committed' : 'ignored'}, ${failed.length} failed.`
              : `Couldn't ${action} ${failed.length === 1 ? 'that candidate' : 'those candidates'}.`,
          )
        }
      } catch (error) {
        setCandidates((current) => {
          const next = [...current]
          removed.forEach(({ index, candidate }) => next.splice(Math.min(index, next.length), 0, candidate))
          return next
        })
        showBanner(errorMessage(error, `Couldn't ${action} those candidates — they're back.`))
      }
    },
    [callWithAuthRetry, showBanner],
  )

  const bulkCommit = useCallback((ids: string[]) => bulkResolve(ids, 'commit'), [bulkResolve])
  const bulkIgnore = useCallback((ids: string[]) => bulkResolve(ids, 'ignore'), [bulkResolve])

  return {
    candidates,
    isLoading,
    loadError,
    bannerMessage,
    dismissBanner,
    editCandidate,
    commit,
    merge,
    ignore,
    bulkCommit,
    bulkIgnore,
  }
}
