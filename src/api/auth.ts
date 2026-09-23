import { apiFetch } from './client'

export interface User {
  id: string
  email: string
  name: string
  email_verified: boolean
  role: string
  banned: boolean
  notes_phone_number: string | null
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

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<void>('/auth/change-password', {
    method: 'POST',
    body: { current_password: currentPassword, new_password: newPassword },
  })
}

export function me(accessToken: string) {
  return apiFetch<User>('/auth/me', { accessToken, withCredentials: false })
}

// Linking a Notes phone number is two steps: a code is sent to the number
// over WhatsApp, and the number is only saved once that code is verified.
// See the backend API.md "Notes integration" section.
export interface NotesPhoneCodeSent {
  phone_number: string
  retry_after_seconds: number
}

export function requestNotesPhoneCode(phoneNumber: string, accessToken: string) {
  return apiFetch<NotesPhoneCodeSent>('/account/notes-phone/request-code', {
    method: 'POST',
    body: { phone_number: phoneNumber },
    accessToken,
    withCredentials: false,
  })
}

export function verifyNotesPhoneCode(phoneNumber: string, code: string, accessToken: string) {
  return apiFetch<{ notes_phone_number: string }>('/account/notes-phone/verify', {
    method: 'POST',
    body: { phone_number: phoneNumber, code },
    accessToken,
    withCredentials: false,
  })
}

export function removeNotesPhone(accessToken: string) {
  return apiFetch<void>('/account/notes-phone', { method: 'DELETE', accessToken, withCredentials: false })
}
