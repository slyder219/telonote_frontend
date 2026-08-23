import { apiFetch } from './client'

export interface User {
  id: string
  email: string
  name: string
  email_verified: boolean
  role: string
  banned: boolean
}

export interface AuthSession {
  user: User
  access_token: string
  expires_in: number
}

export function signup(name: string, email: string, password: string) {
  return apiFetch<AuthSession>('/auth/signup', {
    method: 'POST',
    body: { name, email, password },
  })
}

export function signin(email: string, password: string) {
  return apiFetch<AuthSession>('/auth/signin', {
    method: 'POST',
    body: { email, password },
  })
}

export function refresh() {
  return apiFetch<AuthSession>('/auth/refresh', { method: 'POST' })
}

export function signout() {
  return apiFetch<void>('/auth/signout', { method: 'POST' })
}

export function me(accessToken: string) {
  return apiFetch<User>('/auth/me', { accessToken, withCredentials: false })
}
