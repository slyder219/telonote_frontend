import { useCallback, useEffect, useRef, useState } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuthenticatedRequest } from '../auth/useAuthenticatedRequest'
import * as billingApi from '../api/billing'
import type { BillingStatus } from '../api/billing'
import { openCheckout } from '../billing/paddle'
import Button from '../components/Button'
import Banner from '../components/Banner'

const ACTIVE_STATUSES = new Set(['trialing', 'active', 'past_due'])

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export default function Subscription() {
  usePageMeta('Subscription — Telonote', { noindex: true })
  const callWithAuthRetry = useAuthenticatedRequest()

  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingPlan, setPendingPlan] = useState<'pro_monthly' | 'pro_yearly' | null>(null)
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)

  // Mount-only load, plus a re-check whenever the tab regains focus (the
  // user's likely path back from Paddle's checkout overlay or portal) — see
  // useNotes.ts for why the ref indirection avoids re-fetching on every
  // silent access-token refresh.
  const callRef = useRef(callWithAuthRetry)
  useEffect(() => {
    callRef.current = callWithAuthRetry
  }, [callWithAuthRetry])

  const refetch = useCallback(() => {
    setLoadError(null)
    return callRef
      .current((token) => billingApi.getBillingStatus(token))
      .then((result) => setStatus(result))
      .catch((error) => setLoadError(messageFor(error, "Couldn't load your subscription.")))
  }, [])

  useEffect(() => {
    let cancelled = false
    callRef
      .current((token) => billingApi.getBillingStatus(token))
      .then((result) => {
        if (!cancelled) setStatus(result)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(messageFor(error, "Couldn't load your subscription."))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    window.addEventListener('focus', refetch)
    return () => window.removeEventListener('focus', refetch)
  }, [refetch])

  const handleUpgrade = async (plan: 'pro_monthly' | 'pro_yearly') => {
    setActionError(null)
    setPendingPlan(plan)
    try {
      const info = await callWithAuthRetry((token) => billingApi.getCheckoutInfo(token))
      const priceId = info.price_ids[plan]
      if (!priceId) throw new Error("That plan isn't available right now.")
      await openCheckout(priceId, info)
    } catch (error) {
      setActionError(messageFor(error, "Couldn't start checkout."))
    } finally {
      setPendingPlan(null)
    }
  }

  const handleManageBilling = async () => {
    setActionError(null)
    setIsOpeningPortal(true)
    try {
      const { url } = await callWithAuthRetry((token) => billingApi.createPortalSession(token))
      window.location.href = url
    } catch (error) {
      setActionError(messageFor(error, "Couldn't open the billing portal."))
      setIsOpeningPortal(false)
    }
  }

  const hasAccess = Boolean(status?.subscription_status && ACTIVE_STATUSES.has(status.subscription_status))
  const isPastDue = status?.subscription_status === 'past_due'
  const hasEverSubscribed = status?.subscription_type !== null && status?.subscription_type !== undefined
  const scheduledChange = formatDate(status?.subscription_scheduled_change_at ?? null)
  const expiresAt = formatDate(status?.subscription_expires_at ?? null)

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Subscription</h1>

      {isLoading ? (
        <div className="mt-6 animate-pulse rounded-2xl border border-border bg-surface p-6">
          <div className="h-4 w-32 rounded bg-border" />
          <div className="mt-3 h-3 w-48 rounded bg-border" />
        </div>
      ) : loadError ? (
        <div className="mt-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-center text-sm text-red-500">
          <p>{loadError}</p>
          <Button type="button" variant="secondary" className="mt-3 !px-4 !py-2 !text-sm" onClick={refetch}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {actionError && <Banner message={actionError} onDismiss={() => setActionError(null)} />}

          {isPastDue && (
            <Banner
              message="There's an issue with your last payment. Update your payment method to keep your Pro access."
              onDismiss={() => {}}
            />
          )}

          {hasAccess ? (
            <div className="rounded-2xl border border-brand-400 bg-surface p-6">
              <h2 className="text-base font-semibold text-ink">Pro plan</h2>
              <p className="mt-1 text-sm text-ink-soft">100MB of audio submitted per day.</p>
              {expiresAt && (
                <p className="mt-2 text-sm text-ink-soft">
                  {scheduledChange ? 'Renews' : 'Active until'} {expiresAt}.
                </p>
              )}
              {scheduledChange && (
                <p className="mt-1 text-sm text-ink-soft">Your plan will change on {scheduledChange}.</p>
              )}
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                isLoading={isOpeningPortal}
                onClick={handleManageBilling}
              >
                Manage billing
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-base font-semibold text-ink">Free plan</h2>
              <p className="mt-1 text-sm text-ink-soft">10MB of audio submitted per day.</p>
              {status?.subscription_status === 'canceled' && (
                <p className="mt-2 text-sm text-ink-soft">Your Pro subscription was canceled.</p>
              )}
              {status?.subscription_status === 'paused' && (
                <p className="mt-2 text-sm text-ink-soft">Your Pro subscription is paused.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="primary"
                  isLoading={pendingPlan === 'pro_monthly'}
                  disabled={pendingPlan !== null}
                  onClick={() => handleUpgrade('pro_monthly')}
                >
                  Upgrade to Pro — monthly
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={pendingPlan === 'pro_yearly'}
                  disabled={pendingPlan !== null}
                  onClick={() => handleUpgrade('pro_yearly')}
                >
                  Upgrade to Pro — yearly
                </Button>
              </div>
              {hasEverSubscribed && (
                <button
                  type="button"
                  onClick={handleManageBilling}
                  className="mt-4 block text-xs font-medium text-ink-soft underline decoration-dotted"
                >
                  View billing history
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
