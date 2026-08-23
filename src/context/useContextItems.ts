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

  return {
    items,
    isLoading,
    loadError,
    bannerMessage,
    dismissBanner,
    createItem,
    updateItem,
    deleteItem,
    refetch,
  }
}
