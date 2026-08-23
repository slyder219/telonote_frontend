import { useCallback } from 'react'
import { useAuth } from './AuthContext'
import { ApiError } from '../api/client'

/**
 * Wraps an authenticated API call so a stray 401 (access token expired
 * slightly before the proactive refresh timer fired) transparently retries
 * once with a freshly refreshed token instead of surfacing an error.
 */
export function useAuthenticatedRequest() {
  const auth = useAuth()

  return useCallback(
    async <T,>(fn: (accessToken: string) => Promise<T>): Promise<T> => {
      const token = auth.accessToken
      if (!token) throw new ApiError(401, 'Not authenticated')
      try {
        return await fn(token)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const freshToken = await auth.refreshAccessToken()
          return fn(freshToken)
        }
        throw error
      }
    },
    [auth],
  )
}
