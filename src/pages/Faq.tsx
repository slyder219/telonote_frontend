import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'

// Every answer here describes something that ships in the app — keep it that
// way when editing (see the same rule in components/Features.tsx).

const link = 'text-brand-400 underline'

interface QA {
  q: string
  a: ReactNode
}

const SECTIONS: { title: string; items: QA[] }[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'What is Telonote?',
        a: 'A voice-note app that transcribes what you say using your own vocabulary — the names, jargon and topics you actually use — so transcripts come out spelled the way you mean them.',
      },
      {
        q: 'How do I make a note?',
        a: 'On your dashboard, tap the microphone to start recording and tap it again to stop. Already have a recording? Use "Upload an audio file" under the microphone.',
      },
      {
        q: 'What audio files can I upload?',
        a: 'MP3, M4A/AAC, OGG, WebM, Opus, 3GP, AMR, MP4 and CAF, up to 24MB. Uncompressed files like WAV or FLAC, and files over 24MB, are converted on your device when possible; if that doesn\'t work, export them as MP3 or M4A first.',
      },
      {
        q: 'My note says "Transcribing…" — how long does it take?',
        a: 'Usually a few seconds. A quick first-pass transcript can appear before the refined final one replaces it. Your audio is saved either way, so a note is never lost if a step is slow.',
      },
    ],
  },
  {
    title: 'Context and accuracy',
    items: [
      {
        q: 'What is My Context?',
        a: 'Your personal vocabulary. After a note, Telonote suggests names and terms it thinks you\'ll want remembered — nothing is added until you approve it. You can also add your own, give a term alternate spellings (aliases), and mark it "always include" so it shapes every transcription.',
      },
      {
        q: 'A word was transcribed wrong. How do I fix it?',
        a: 'Edit the transcript directly (swipe a note right, or use its ⋯ menu). To stop it happening again, add the word to My Context, then choose "Re-run transcription" on the note. Re-running counts toward your daily audio allowance.',
      },
    ],
  },
  {
    title: 'Organizing your notes',
    items: [
      {
        q: 'How do I check a note off?',
        a: 'Tap the circle on a note. It turns gray and drops to the bottom of its day, so what\'s left stays on top. Tap it again to undo.',
      },
      {
        q: 'How does search work?',
        a: '"Search text" matches the words in your notes as you type. "Search by meaning" finds notes about an idea even when they don\'t use the same words — for example, "that call about the budget".',
      },
      {
        q: 'How do I select several notes?',
        a: 'Tap Select. On a computer, click one note and Shift-click another to select everything between them, or Ctrl/Cmd-click to add or remove single notes. Then copy, share, export or delete them together.',
      },
      {
        q: 'I deleted a note by mistake.',
        a: 'Tap Undo on the message that appears right after deleting. Once it disappears, the note is gone.',
      },
    ],
  },
  {
    title: 'Sharing and exporting',
    items: [
      {
        q: 'How do I send a note to Apple Notes or Reminders?',
        a: 'On your phone, open a note\'s ⋯ menu and choose Share…, then pick the app. You can share several at once with Select → Share. Sharing uses your phone\'s share sheet, so it only appears on devices and browsers that support it.',
      },
      {
        q: 'Can I get my notes into Apple Notes as checkboxes?',
        a: 'Yes. Select the notes, choose Export → "Apple Notes checklist (.enex)", then on a Mac open Notes and use File → Import to Notes. Each day becomes one note with a checkable line per voice note, and notes you\'ve already checked off arrive ticked. The phone share sheet can only send plain text, which can\'t carry checkboxes — that\'s why this goes through a file.',
      },
      {
        q: 'What export formats are there?',
        a: 'Text, Markdown, Apple Notes (.enex), Apple Notes checklist (.enex), CSV and JSON. Export a selection, or use "Export your notes" on the dashboard to take everything.',
      },
      {
        q: 'Can I keep the original audio?',
        a: 'Yes — use "Download audio" on any note. Bulk export of audio alongside text is not available yet.',
      },
    ],
  },
  {
    title: 'Plans, billing and your account',
    items: [
      {
        q: 'What are the limits?',
        a: (
          <>
            Free includes 10MB of submitted audio per day and Pro includes 100MB. Saved notes are unlimited on both.
            The allowance resets daily. See{' '}
            <Link to="/pricing" className={link}>
              Pricing
            </Link>{' '}
            for details.
          </>
        ),
      },
      {
        q: 'How do I cancel or get a refund?',
        a: (
          <>
            Manage your plan on the Subscription page. Cancelling stops future renewals right away. Our{' '}
            <Link to="/refunds" className={link}>
              Refund Policy
            </Link>{' '}
            has the details.
          </>
        ),
      },
      {
        q: 'How do I change my password?',
        a: 'Open Account (the person icon at the top on a phone) and use Change password. You\'ll stay signed in on that device.',
      },
      {
        q: 'Who can see my notes?',
        a: (
          <>
            Your notes are private to your account. We don't sell or share your data with outside companies. The{' '}
            <Link to="/privacy" className={link}>
              Privacy Policy
            </Link>{' '}
            lists the few service providers that process data to run the app.
          </>
        ),
      },
      {
        q: 'Something isn\'t working.',
        a: (
          <>
            Email{' '}
            <a href="mailto:telonote@truepeak.us" className={link}>
              telonote@truepeak.us
            </a>{' '}
            and tell us what you were doing — we read everything.
          </>
        ),
      },
    ],
  },
]

export default function Faq() {
  usePageMeta('FAQ — Telonote')

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Frequently asked questions</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">Quick answers about recording, context, sharing and plans.</p>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {section.items.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-[15px] font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0 text-ink-soft transition-transform group-open:rotate-180"
                  >
                    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-sm leading-relaxed text-ink-soft">{item.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
