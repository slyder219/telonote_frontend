import { usePageMeta } from '../hooks/usePageMeta'

const h2 = 'mt-8 text-lg font-semibold text-ink'
const p = 'mt-2 text-sm leading-relaxed text-ink-soft'
const ul = 'mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft'

export default function Privacy() {
  usePageMeta('Privacy Policy — Telonote')

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-soft">Last updated: August 23, 2026</p>

      <p className={p}>
        This Privacy Policy explains what information Telonote collects, how we use it, and — most importantly —
        who we share it with. The short version: <strong className="text-ink">we don't sell or share your personal
        data with outside companies.</strong> The rest of this page explains the details.
      </p>

      <h2 className={h2}>1. Information We Collect</h2>
      <ul className={ul}>
        <li><strong className="text-ink">Account information</strong> — your email address and any name you provide when you sign up.</li>
        <li><strong className="text-ink">Your content</strong> — the audio you record or upload, the transcripts generated from it, and the personal vocabulary/context items (names, jargon, aliases) you build up over time.</li>
        <li><strong className="text-ink">Usage information</strong> — things like how much of your daily quota you've used, so we can show you accurate limits.</li>
        <li><strong className="text-ink">Payment information</strong> — for paid plans, your payment is handled entirely by our payment processor, Paddle. We never see or store your full card details.</li>
      </ul>

      <h2 className={h2}>2. How We Use Your Information</h2>
      <ul className={ul}>
        <li>To provide the Service — recording, transcribing, and storing your notes so you can find and use them later.</li>
        <li>To build and apply your personal context vocabulary, which improves transcription accuracy specifically for you.</li>
        <li>To process payments and manage your subscription, via Paddle.</li>
        <li>To send you service-related communications (e.g. account or billing notices) — not marketing, unless you separately opt in.</li>
      </ul>

      <h2 className={h2}>3. Who We Share Data With</h2>
      <p className={p}>
        We do not sell your personal data, and we do not share it with outside companies for their own marketing,
        advertising, or resale purposes — full stop.
      </p>
      <p className={p}>
        To actually run the Service, a small number of service providers process data strictly on our behalf, under
        confidentiality obligations, and only for the purpose of delivering Telonote to you — never for their own
        independent use:
      </p>
      <ul className={ul}>
        <li><strong className="text-ink">Paddle</strong> — processes payments for paid subscriptions as our merchant of record.</li>
        <li><strong className="text-ink">Cloud infrastructure and AI processing providers</strong> — host our servers and run the transcription models that turn your audio into text.</li>
      </ul>
      <p className={p}>
        We may also disclose information if required by law, or to protect the rights, safety, or property of
        Telonote or our users.
      </p>

      <h2 className={h2}>4. Data Retention and Deletion</h2>
      <p className={p}>
        Your notes and context items are kept until you delete them or close your account. Deleting a note, context
        item, or your entire account removes the associated data from our active systems; residual copies in
        backups are purged on our normal backup rotation schedule.
      </p>

      <h2 className={h2}>5. Your Rights</h2>
      <p className={p}>
        You can view, edit, and delete your notes and context items directly in the app at any time. To request a
        full export or deletion of your account data, email us and we'll take care of it.
      </p>

      <h2 className={h2}>6. Security</h2>
      <p className={p}>
        We use industry-standard measures to protect your data, including encryption of data in transit and access
        controls limiting who can reach production systems. No system is perfectly secure, but we take reasonable
        steps to protect your information.
      </p>

      <h2 className={h2}>7. Cookies and Local Storage</h2>
      <p className={p}>
        We use a minimal, essential session cookie to keep you signed in, and your browser's local storage to
        remember app preferences on your device. We don't use third-party advertising or tracking cookies.
      </p>

      <h2 className={h2}>8. Children's Privacy</h2>
      <p className={p}>
        Telonote isn't directed at children, and we don't knowingly collect information from anyone under 13. If
        you believe a child has provided us information, contact us and we'll delete it.
      </p>

      <h2 className={h2}>9. Changes to This Policy</h2>
      <p className={p}>
        We may update this Privacy Policy from time to time. If we make material changes, we'll take reasonable
        steps to let you know.
      </p>

      <h2 className={h2}>10. Contact</h2>
      <p className={p}>
        Questions about this policy, or want to exercise any of the rights above? Email{' '}
        <a href="mailto:support@telonote.com" className="text-brand-400 underline">
          support@telonote.com
        </a>
        .
      </p>
    </div>
  )
}
