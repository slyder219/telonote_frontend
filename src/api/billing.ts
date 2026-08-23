import { apiFetch } from './client'

export interface CheckoutInfo {
  price_ids: Record<string, string>
  customer_email: string
  custom_data: Record<string, unknown>
  environment: string
}

export function getCheckoutInfo(accessToken: string) {
  return apiFetch<CheckoutInfo>('/billing/checkout-info', { accessToken, withCredentials: false })
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | null

export interface BillingStatus {
  subscription_status: SubscriptionStatus
  subscription_type: string | null
  subscription_started_at: string | null
  subscription_expires_at: string | null
  subscription_scheduled_change_at: string | null
}

export function getBillingStatus(accessToken: string) {
  return apiFetch<BillingStatus>('/billing/status', { accessToken, withCredentials: false })
}

export function createPortalSession(accessToken: string) {
  return apiFetch<{ url: string }>('/billing/portal-session', {
    method: 'POST',
    accessToken,
    withCredentials: false,
  })
}
