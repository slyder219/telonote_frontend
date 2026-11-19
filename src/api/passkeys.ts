import { apiFetch } from './client'
import type { AuthSession } from './auth'

// Passkeys (WebAuthn) against the backend's /passkeys endpoints. The server
// sends options as JSON with base64url strings; the browser API wants
// ArrayBuffers, and the result goes back as JSON again.

export interface Passkey {
  id: string
  name: string | null
  device_type: string | null
  backed_up: boolean
  created_at: string
  last_used_at: string | null
}

interface Ceremony {
  challenge_id: string
  options: Record<string, unknown>
}

/** Options for one registration, fetched ahead so the browser prompt can open straight from a click. */
export interface PreparedRegistration {
  challengeId: string
  publicKey: PublicKeyCredentialCreationOptions
  fetchedAt: number
}

function fromBase64url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function toBase64url(buffer: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window && !!navigator.credentials
}

export function listPasskeys(accessToken: string) {
  return apiFetch<Passkey[]>('/passkeys', { accessToken, withCredentials: false })
}

export function deletePasskey(id: string, accessToken: string) {
  return apiFetch<void>(`/passkeys/${id}`, { method: 'DELETE', accessToken, withCredentials: false })
}

export async function prepareRegistration(accessToken: string): Promise<PreparedRegistration> {
  const { challenge_id, options } = await apiFetch<Ceremony>('/passkeys/register/options', {
    method: 'POST',
    accessToken,
    withCredentials: false,
  })
  const o = options as unknown as {
    challenge: string
    user: { id: string; name: string; displayName: string }
    excludeCredentials?: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[]
  } & Omit<PublicKeyCredentialCreationOptions, 'challenge' | 'user' | 'excludeCredentials'>
  return {
    challengeId: challenge_id,
    fetchedAt: Date.now(),
    publicKey: {
      ...o,
      challenge: fromBase64url(o.challenge),
      user: { ...o.user, id: fromBase64url(o.user.id) },
      excludeCredentials: (o.excludeCredentials ?? []).map((c) => ({ ...c, id: fromBase64url(c.id) })),
    },
  }
}

/** Opens the browser's passkey prompt; call directly from a click. Null if the user dismissed it. */
export async function createCredential(prepared: PreparedRegistration): Promise<Record<string, unknown> | null> {
  let credential: PublicKeyCredential | null
  try {
    credential = (await navigator.credentials.create({ publicKey: prepared.publicKey })) as PublicKeyCredential | null
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') return null // dismissed or timed out
    throw error
  }
  if (!credential) return null
  const response = credential.response as AuthenticatorAttestationResponse
  return {
    id: credential.id,
    rawId: toBase64url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: toBase64url(response.clientDataJSON),
      attestationObject: toBase64url(response.attestationObject),
      transports: response.getTransports?.() ?? [],
    },
  }
}

export function verifyRegistration(
  challengeId: string,
  credential: Record<string, unknown>,
  name: string | null,
  accessToken: string,
) {
  return apiFetch<Passkey>('/passkeys/register/verify', {
    method: 'POST',
    body: { challenge_id: challengeId, credential, name },
    accessToken,
    withCredentials: false,
  })
}

// ---- signing in --------------------------------------------------------------

/** Options for one sign-in, fetched ahead so the browser prompt can open straight from a click. */
export interface PreparedAuthentication {
  challengeId: string
  publicKey: PublicKeyCredentialRequestOptions
  fetchedAt: number
}

export async function prepareAuthentication(): Promise<PreparedAuthentication> {
  const { challenge_id, options } = await apiFetch<Ceremony>('/passkeys/authenticate/options', {
    method: 'POST',
    withCredentials: false,
  })
  const o = options as unknown as {
    challenge: string
    allowCredentials?: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[]
  } & Omit<PublicKeyCredentialRequestOptions, 'challenge' | 'allowCredentials'>
  return {
    challengeId: challenge_id,
    fetchedAt: Date.now(),
    publicKey: {
      ...o,
      challenge: fromBase64url(o.challenge),
      allowCredentials: (o.allowCredentials ?? []).map((c) => ({ ...c, id: fromBase64url(c.id) })),
    },
  }
}

/** Opens the browser's passkey prompt for signing in; call directly from a click. Null if dismissed. */
export async function getAssertion(prepared: PreparedAuthentication): Promise<Record<string, unknown> | null> {
  let credential: PublicKeyCredential | null
  try {
    credential = (await navigator.credentials.get({ publicKey: prepared.publicKey })) as PublicKeyCredential | null
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') return null
    throw error
  }
  if (!credential) return null
  const response = credential.response as AuthenticatorAssertionResponse
  return {
    id: credential.id,
    rawId: toBase64url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: toBase64url(response.clientDataJSON),
      authenticatorData: toBase64url(response.authenticatorData),
      signature: toBase64url(response.signature),
      userHandle: response.userHandle ? toBase64url(response.userHandle) : undefined,
    },
  }
}

/** Same response as /auth/signin, and sets the same session cookie (so it needs credentials). */
export function verifyAuthentication(challengeId: string, credential: Record<string, unknown>) {
  return apiFetch<AuthSession>('/passkeys/authenticate/verify', {
    method: 'POST',
    body: { challenge_id: challengeId, credential },
  })
}
