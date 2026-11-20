import { usePageMeta } from '../hooks/usePageMeta'

const h2 = 'mt-8 text-lg font-semibold text-ink'
const p = 'mt-2 text-sm leading-relaxed text-ink-soft'
const ul = 'mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft'

export default function Privacy() {
  usePageMeta('Privacy Policy — Telonote')

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-soft">Last updated: November 20, 2026</p>

      <p className={p}>
        This Privacy Policy explains what information Telonote collects, how we use it, and — most importantly —
        who we share it with. The short version: <strong className="text-ink">we don't sell or share your personal
        data with outside companies.</strong> The rest of this page explains the details.
      </p>

      <h2 className={h2}>1. Information We Collect</h2>
      <ul className={ul}>
        <li><strong className="text-ink">Account information</strong> — your email address and any name you provide when you sign up. If you add a passkey, we store only its public key; the private key stays in your device's keychain (such as iCloud Keychain) and never reaches us.</li>
        <li><strong className="text-ink">Your content</strong> — the audio you record or upload, the transcripts generated from it, and the personal vocabulary/context items (names, jargon, aliases) you build up over time.</li>
        <li><strong className="text-ink">Phone number (optional)</strong> — only if you link a Notes phone number in your account so you can import notes into Notes, a separate WhatsApp-based notes service. You can remove it at any time.</li>
        <li><strong className="text-ink">Settings</strong> — preferences such as how transcripts are formatted.</li>
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

      <h2 className={h2}>3. Telonote Keyboard</h2>
      <p className={p}>
        The Telonote Keyboard for iPhone lets you dictate into other apps. iOS doesn't let keyboards use the
        microphone, so the Telonote app records for it. That's why the keyboard asks for Full Access: it needs it to
        pass dictations to and from the Telonote app on your phone, and to put a transcript on your clipboard if it
        can't be typed into the field.
      </p>
      <ul className={ul}>
        <li><strong className="text-ink">What you type is never collected.</strong> The keyboard doesn't record, store, or send your keystrokes, and it makes no network connections of its own.</li>
        <li>To place a transcript, check that it arrived, and clear a field when you ask it to, the keyboard reads the text around the cursor. That happens only on your phone and is never stored or sent anywhere.</li>
        <li>Your most recent dictation's text is kept on your phone for up to an hour, so the keyboard's Insert button can type it in again. It's shared only between the Telonote app and keyboard on your phone.</li>
        <li>Dictations you make with the keyboard are handled exactly like any other recording: the Telonote app uploads the audio, it's transcribed as described in this policy, and it's saved to your notes, where you can delete it.</li>
        <li>You can turn off Full Access or remove the keyboard at any time in iOS Settings → General → Keyboard.</li>
      </ul>

      <h2 className={h2}>4. Who We Share Data With</h2>
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
        <li><strong className="text-ink">OpenAI</strong> — transcribes your audio and processes your transcripts and context items (for search by meaning and building your vocabulary). OpenAI processes this data only to provide Telonote and does not use it to train its models. The Telonote app asks for your permission before sending anything to OpenAI.</li>
        <li><strong className="text-ink">Notes (WhatsApp)</strong> — only if you link a Notes phone number. We send that number to Notes so it can text you a verification code over WhatsApp (operated by Meta), and when you choose to import a note, we send that note's transcript to Notes. Nothing is sent to Notes unless you link a number and import a note.</li>
        <li><strong className="text-ink">Cloud infrastructure providers</strong> — host our servers and database.</li>
      </ul>
      <p className={p}>
        We may also disclose information if required by law, or to protect the rights, safety, or property of
        Telonote or our users.
      </p>

      <h2 className={h2}>5. Data Retention and Deletion</h2>
      <p className={p}>
        Your notes and context items are kept until you delete them or close your account. Deleting a note, context
        item, or your entire account removes the associated data from our active systems; residual copies in
        backups are purged on our normal backup rotation schedule.
      </p>

      <h2 className={h2}>6. Your Rights</h2>
      <p className={p}>
        You can view, edit, and delete your notes and context items directly in the app at any time. To request a
        full export or deletion of your account data, email us and we'll take care of it.
      </p>

      <h2 className={h2}>7. Security</h2>
      <p className={p}>
        We use industry-standard measures to protect your data, including encryption of data in transit and access
        controls limiting who can reach production systems. No system is perfectly secure, but we take reasonable
        steps to protect your information.
      </p>

      <h2 className={h2}>8. Cookies and Local Storage</h2>
      <p className={p}>
        We use a minimal, essential session cookie to keep you signed in, and your browser's local storage to
        remember app preferences on your device. The iPhone app likewise keeps its sign-in session and settings on your
        phone. We don't use third-party advertising or tracking cookies.
      </p>

      <h2 className={h2}>9. Children's Privacy</h2>
      <p className={p}>
        Telonote isn't directed at children, and we don't knowingly collect information from anyone under 13. If
        you believe a child has provided us information, contact us and we'll delete it.
      </p>

      <h2 className={h2}>10. Changes to This Policy</h2>
      <p className={p}>
        We may update this Privacy Policy from time to time. If we make material changes, we'll take reasonable
        steps to let you know.
      </p>

      <h2 className={h2}>11. Contact</h2>
      <p className={p}>
        Questions about this policy, or want to exercise any of the rights above? Email{' '}
        <a href="mailto:telonote@truepeak.us" className="text-brand-400 underline">
          telonote@truepeak.us
        </a>
        .
      </p>
    </div>
  )
}
