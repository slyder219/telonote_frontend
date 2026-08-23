const PROD_BASE_URL = 'https://telonote-backend-862230541486.us-central1.run.app'

export const API_BASE_URL = import.meta.env.VITE_LOCAL_BACKEND || PROD_BASE_URL

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export class NetworkError extends Error {}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  accessToken?: string | null
  withCredentials?: boolean
  signal?: AbortSignal
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0)
}

async function extractErrorMessage(response: Response): Promise<string> {
  let data: unknown
  try {
    data = await response.json()
  } catch {
    return `Request failed with status ${response.status}`
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>

    // FastAPI validation errors: {"detail": [{"msg": "...", "loc": [...]}, ...]}
    if (Array.isArray(record.detail)) {
      const messages = record.detail
        .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>).msg : item))
        .filter((msg): msg is string => typeof msg === 'string')
      if (messages.length > 0) return messages.join(' ')
    }

    const message = firstString(record.detail, record.message, record.error, record.error_description)
    if (message) return message
  }

  return `Request failed with status ${response.status}`
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken, withCredentials = true, signal } = options
  const isFormData = body instanceof FormData

  const headers: Record<string, string> = {}
  // FormData sets its own Content-Type (with the multipart boundary) — never override it.
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: withCredentials ? 'include' : 'omit',
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new NetworkError("Can't reach the server. Check your connection and try again.")
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
