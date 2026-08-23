import { apiFetch } from './client'

export interface ContextItem {
  id: string
  term: string
  description: string | null
  category: string | null
  always_include: boolean
  is_active: boolean
  source_type: 'manual' | 'extracted'
  created_at: string
  updated_at: string
  aliases: string[]
}

export type CandidateStatus = 'pending' | 'added' | 'merged' | 'ignored'

export interface ContextCandidate {
  id: string
  note_id: string
  proposed_term: string
  proposed_description: string | null
  proposed_category: string | null
  status: CandidateStatus
  context_item_id: string | null
  created_at: string
  resolved_at: string | null
  aliases: string[]
}

export interface CreateContextItemInput {
  term: string
  description?: string
  category?: string
  always_include?: boolean
}

export interface UpdateContextItemInput {
  term?: string
  description?: string
  category?: string
  always_include?: boolean
  is_active?: boolean
}

export interface UpdateCandidateInput {
  proposed_term?: string
  proposed_description?: string
  proposed_category?: string
  aliases?: string[]
}

export function listContextItems(accessToken: string) {
  return apiFetch<ContextItem[]>('/context/items', { accessToken, withCredentials: false })
}

export function createContextItem(input: CreateContextItemInput, accessToken: string) {
  return apiFetch<ContextItem>('/context/items', {
    method: 'POST',
    body: input,
    accessToken,
    withCredentials: false,
  })
}

export function updateContextItem(id: string, input: UpdateContextItemInput, accessToken: string) {
  return apiFetch<ContextItem>(`/context/items/${id}`, {
    method: 'PATCH',
    body: input,
    accessToken,
    withCredentials: false,
  })
}

export function deleteContextItem(id: string, accessToken: string) {
  return apiFetch<void>(`/context/items/${id}`, { method: 'DELETE', accessToken, withCredentials: false })
}

export function listCandidates(accessToken: string, status: CandidateStatus | '' = 'pending') {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  const query = params.toString()
  return apiFetch<ContextCandidate[]>(`/context/candidates${query ? `?${query}` : ''}`, {
    accessToken,
    withCredentials: false,
  })
}

export function updateCandidate(id: string, input: UpdateCandidateInput, accessToken: string) {
  return apiFetch<ContextCandidate>(`/context/candidates/${id}`, {
    method: 'PATCH',
    body: input,
    accessToken,
    withCredentials: false,
  })
}

export function commitCandidate(id: string, accessToken: string) {
  return apiFetch<ContextCandidate>(`/context/candidates/${id}/commit`, {
    method: 'POST',
    accessToken,
    withCredentials: false,
  })
}

export function mergeCandidate(id: string, contextItemId: string, accessToken: string) {
  return apiFetch<ContextCandidate>(`/context/candidates/${id}/merge`, {
    method: 'POST',
    body: { context_item_id: contextItemId },
    accessToken,
    withCredentials: false,
  })
}

export function ignoreCandidate(id: string, accessToken: string) {
  return apiFetch<ContextCandidate>(`/context/candidates/${id}/ignore`, {
    method: 'POST',
    accessToken,
    withCredentials: false,
  })
}

export interface BulkCandidateResult {
  id: string
  ok: boolean
  detail: string
}

export function bulkResolveCandidates(
  ids: string[],
  action: 'commit' | 'ignore',
  accessToken: string,
) {
  return apiFetch<BulkCandidateResult[]>('/context/candidates/bulk', {
    method: 'POST',
    body: { ids, action },
    accessToken,
    withCredentials: false,
  })
}
