import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/auth'
import type { AuthSession, User } from '../api/auth'
import { ApiError, NetworkError } from '../api/client'

interface Session {
  user: User
  accessToken: string
  expiresAt: number
}

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<string>
}

const REFRESH_MARGIN_MS = 60_000

const AuthContext = createContext<AuthContextValue | null>(null)

function toSession(auth: AuthSession): Session {
  return {
    user: auth.user,
    accessToken: auth.access_token,
    expiresAt: Date.now() + auth.expires_in * 1000,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Bootstrap: the session cookie (if any) lets us mint a fresh access token
  // on load without the user having to log in again.
  useEffect(() => {
    let cancelled = false
    authApi
      .refresh()
      .then((auth) => {
        if (!cancelled) setSession(toSession(auth))
      })
      .catch(() => {
        if (!cancelled) setSession(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Proactively refresh the access token shortly before it expires.
  useEffect(() => {
    if (!session) return
    const delay = Math.max(session.expiresAt - Date.now() - REFRESH_MARGIN_MS, 0)
    const timer = setTimeout(() => {
      authApi
        .refresh()
        .then((auth) => setSession(toSession(auth)))
        .catch(() => setSession(null))
    }, delay)
    return () => clearTimeout(timer)
  }, [session])

  const login = async (email: string, password: string) => {
    const auth = await authApi.signin(email, password)
    setSession(toSession(auth))
  }

  const signup = async (name: string, email: string, password: string) => {
    const auth = await authApi.signup(name, email, password)
    setSession(toSession(auth))
  }

  // Lets callers outside the proactive-refresh timer (e.g. a notes API call
  // that got an unexpected 401) force a new access token on demand.
  const refreshAccessToken = async () => {
    const auth = await authApi.refresh()
    setSession(toSession(auth))
    return auth.access_token
  }

  const logout = async () => {
    try {
      await authApi.signout()
    } catch (error) {
      if (!(error instanceof ApiError) && !(error instanceof NetworkError)) throw error
    }
    setSession(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: session !== null,
      isLoading,
      login,
      signup,
      logout,
      refreshAccessToken,
    }),
    [session, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
