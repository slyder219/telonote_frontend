import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuth } from '../auth/AuthContext'
import Button from '../components/Button'

export default function Pricing() {
  usePageMeta('Pricing — Telonote')
  const { isAuthenticated } = useAuth()

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Pricing</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Simple, usage-based pricing. Both plans include context-aware transcription, search, and everything else in
        the app.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-base font-semibold text-ink">Free</h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">$0</p>
          <p className="mt-1 text-sm text-ink-soft">10MB of audio submitted per day</p>
          <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            <li>Context-aware transcription</li>
            <li>Unlimited saved notes</li>
            <li>Search by text or meaning</li>
          </ul>
          <Link to={isAuthenticated ? '/dashboard' : '/signup'} className="mt-6 block">
            <Button variant="secondary" fullWidth>
              {isAuthenticated ? 'Go to your dashboard' : 'Get started'}
            </Button>
          </Link>
        </div>

        <div className="rounded-2xl border border-brand-400 bg-surface p-6">
          <h2 className="text-base font-semibold text-ink">Pro</h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            $7.89<span className="text-sm font-normal text-ink-soft">/month</span>
          </p>
          <p className="mt-1 text-sm text-ink-soft">100MB of audio submitted per day</p>
          <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            <li>Everything in Free</li>
            <li>10x the daily audio allowance</li>
            <li>Re-transcription counts against the same generous cap</li>
          </ul>
          <Link to={isAuthenticated ? '/subscription' : '/signup'} className="mt-6 block">
            <Button variant="primary" fullWidth>
              {isAuthenticated ? 'Upgrade to Pro' : 'Get started'}
            </Button>
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink-soft">
        Pricing shown here is subject to change — the price displayed at checkout at the time you subscribe is
        authoritative. Payments are processed by Paddle, our merchant of record. See our{' '}
        <Link to="/refunds" className="text-brand-600 underline">
          Refund Policy
        </Link>{' '}
        for cancellations and refunds.
      </p>
    </div>
  )
}
