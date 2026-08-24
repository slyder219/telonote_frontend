import { usePageMeta } from '../hooks/usePageMeta'

const h2 = 'mt-8 text-lg font-semibold text-ink'
const p = 'mt-2 text-sm leading-relaxed text-ink-soft'
const ul = 'mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft'

export default function Refunds() {
  usePageMeta('Refund Policy — Telonote')

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Refund Policy</h1>
      <p className="mt-2 text-sm text-ink-soft">Last updated: August 23, 2026</p>

      <p className={p}>
        Payments for Telonote subscriptions are processed by Paddle.com Market Ltd ("Paddle"), acting as our
        merchant of record. Your order confirmation and receipt come from Paddle, and Paddle's own buyer refund
        policy applies to your purchase in addition to what's below.
      </p>

      <h2 className={h2}>Cancelling Your Subscription</h2>
      <p className={p}>
        You can cancel your subscription at any time from your account settings. Cancelling stops future renewals
        immediately — you won't be charged again after your current billing period ends.
      </p>

      <h2 className={h2}>Refunds and Proration</h2>
      <p className={p}>
        If you cancel partway through a billing period, we'll issue a prorated refund for the unused portion of
        that period on request. If something went wrong on our end — a billing error, or a service issue that
        meaningfully prevented you from using Telonote — contact us and we'll make it right, including a full or
        partial refund where appropriate.
      </p>
      <p className={p}>
        Refunds are issued back to your original payment method through Paddle and may take several business days
        to appear, depending on your bank or card provider.
      </p>

      <h2 className={h2}>How to Request a Refund</h2>
      <p className={p}>
        Email{' '}
        <a href="mailto:support@telonote.com" className="text-brand-400 underline">
          support@telonote.com
        </a>{' '}
        with your order or receipt ID (from your Paddle confirmation email) and a brief description of why you're
        requesting a refund. We aim to respond within a few business days.
      </p>

      <h2 className={h2}>Non-Refundable Circumstances</h2>
      <ul className={ul}>
        <li>Requests made solely to avoid a subscription you forgot to cancel and used substantially through the period.</li>
        <li>Accounts terminated for violating our Terms of Service.</li>
        <li>Repeated refund requests that suggest abuse of this policy.</li>
      </ul>
      <p className={p}>We evaluate these on a case-by-case basis and reserve the right to make exceptions.</p>

      <h2 className={h2}>Changes to This Policy</h2>
      <p className={p}>
        We may update this Refund Policy from time to time. If we make material changes, we'll take reasonable
        steps to let you know.
      </p>

      <h2 className={h2}>Contact</h2>
      <p className={p}>
        Questions about billing or refunds? Email{' '}
        <a href="mailto:support@telonote.com" className="text-brand-400 underline">
          support@telonote.com
        </a>
        .
      </p>
    </div>
  )
}
