import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthenticatedRequest } from '../auth/useAuthenticatedRequest'
import * as contextApi from '../api/context'
import type { ContextItem, CreateContextItemInput, UpdateContextItemInput } from '../api/context'
import { ApiError, NetworkError } from '../api/client'

const BANNER_TIMEOUT_MS = 5000

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError || error instanceof NetworkError ? error.message : fallback
}

export function useContextItems() {
  const callWithAuthRetry = useAuthenticatedRequest()
  const [items, setItems] = useState<ContextItem[]>([])
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

  // Mount-only load — see useNotes.ts for why this ref indirection exists
  // (avoids re-fetching everything whenever the access token silently refreshes).
  const callRef = useRef(callWithAuthRetry)
  useEffect(() => {
    callRef.current = callWithAuthRetry
  }, [callWithAuthRetry])

  const refetch = useCallback(async () => {
    try {
      const list = await callWithAuthRetry((token) => contextApi.listContextItems(token))
      setItems(list)
    } catch (error) {
      showBanner(errorMessage(error, 'Could not refresh your context.'))
    }
  }, [callWithAuthRetry, showBanner])

  useEffect(() => {
    let cancelled = false
    callRef
      .current((token) => contextApi.listContextItems(token))
      .then((list) => {
        if (!cancelled) setItems(list)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error, 'Could not load your context.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const createItem = useCallback(
    async (input: CreateContextItemInput) => {
      const tempId = `temp-${crypto.randomUUID()}`
      const optimistic: ContextItem = {
        id: tempId,
        term: input.term,
        description: input.description ?? null,
        category: input.category ?? null,
        always_include: input.always_include ?? false,
        is_active: true,
        source_type: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        aliases: [],
      }
      setItems((current) => [optimistic, ...current])

      try {
        const created = await callWithAuthRetry((token) => contextApi.createContextItem(input, token))
        setItems((current) => current.map((item) => (item.id === tempId ? created : item)))
      } catch (error) {
        setItems((current) => current.filter((item) => item.id !== tempId))
        showBanner(errorMessage(error, "Couldn't add that item."))
      }
    },
    [callWithAuthRetry, showBanner],
  )

  const updateItem = useCallback(
    async (id: string, input: UpdateContextItemInput) => {
      let previous: ContextItem | undefined
      setItems((current) =>
        current.map((item) => {
          if (item.id !== id) return item
          previous = item
          return { ...item, ...input }
        }),
      )

      try {
        const updated = await callWithAuthRetry((token) => contextApi.updateContextItem(id, input, token))
        setItems((current) => current.map((item) => (item.id === id ? updated : item)))
      } catch (error) {
        setItems((current) => current.map((item) => (item.id === id && previous ? previous : item)))
        showBanner(errorMessage(error, "Couldn't save that change."))
      }
    },
    [callWithAuthRetry, showBanner],
  )

  const deleteItem = useCallback(
    async (id: string) => {
      let removed: ContextItem | undefined
      let removedIndex = -1
      setItems((current) => {
        removedIndex = current.findIndex((item) => item.id === id)
        removed = current[removedIndex]
        return current.filter((item) => item.id !== id)
      })

      try {
        await callWithAuthRetry((token) => contextApi.deleteContextItem(id, token))
      } catch (error) {
        setItems((current) => {
          if (!removed) return current
          const next = [...current]
          next.splice(Math.min(removedIndex, next.length), 0, removed)
          return next
        })
        showBanner(errorMessage(error, "Couldn't delete that item — it's back."))
      }
    },
    [callWithAuthRetry, showBanner],
  )

  // There's no bulk endpoint for items (only candidates has one) — this fans
  // the existing per-item calls out in parallel and reconciles per result,
  // so a partial failure only rolls back the items that actually failed.
  const bulkDelete = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return
      const idSet = new Set(ids)
      let removed: { index: number; item: ContextItem }[] = []
      setItems((current) => {
        removed = current.map((item, index) => ({ index, item })).filter(({ item }) => idSet.has(item.id))
        return current.filter((item) => !idSet.has(item.id))
      })

      const results = await Promise.allSettled(
        ids.map((id) => callWithAuthRetry((token) => contextApi.deleteContextItem(id, token))),
      )
      const failedIds = new Set(ids.filter((_, i) => results[i].status === 'rejected'))
      if (failedIds.size > 0) {
        setItems((current) => {
          const next = [...current]
          removed
            .filter(({ item }) => failedIds.has(item.id))
            .forEach(({ index, item }) => next.splice(Math.min(index, next.length), 0, item))
          return next
        })
        const succeeded = ids.length - failedIds.size
        showBanner(
          succeeded > 0
            ? `Deleted ${succeeded}, ${failedIds.size} failed.`
            : `Couldn't delete ${failedIds.size === 1 ? 'that item' : 'those items'}.`,
        )
      }
    },
    [callWithAuthRetry, showBanner],
  )

  const bulkSetAlwaysInclude = useCallback(
    async (ids: string[], value: boolean) => {
      if (ids.length === 0) return
      const idSet = new Set(ids)
      const previous = new Map(items.filter((item) => idSet.has(item.id)).map((item) => [item.id, item]))
      setItems((current) =>
        current.map((item) => (idSet.has(item.id) ? { ...item, always_include: value } : item)),
      )

      const results = await Promise.allSettled(
        ids.map((id) =>
          callWithAuthRetry((token) => contextApi.updateContextItem(id, { always_include: value }, token)),
        ),
      )

      const failedIds: string[] = []
      setItems((current) =>
        current.map((item) => {
          const index = ids.indexOf(item.id)
          if (index === -1) return item
          const result = results[index]
          if (result.status === 'fulfilled') return result.value
          failedIds.push(item.id)
          return previous.get(item.id) ?? item
        }),
      )
      if (failedIds.length > 0) {
        const succeeded = ids.length - failedIds.length
        showBanner(
          succeeded > 0
            ? `Updated ${succeeded}, ${failedIds.length} failed.`
            : `Couldn't update ${failedIds.length === 1 ? 'that item' : 'those items'}.`,
        )
      }
    },
    [items, callWithAuthRetry, showBanner],
  )

  return {
    items,
    isLoading,
    loadError,
    bannerMessage,
    dismissBanner,
    createItem,
    updateItem,
    deleteItem,
    bulkDelete,
    bulkSetAlwaysInclude,
    refetch,
  }
}
