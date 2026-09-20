import type { ReactNode } from 'react'

// Every claim here is backed by something that ships in the app — keep it that
// way when editing (no "coming soon", no capabilities that aren't built).

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'It learns your vocabulary',
    body: 'After each note, Telonote suggests the names and terms it thinks you\'ll want it to remember. You approve every one — nothing is added behind your back.',
    icon: (
      <Icon>
        <path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5z" />
        <path d="M4 20a2 2 0 0 1 2-2h13v3H6a2 2 0 0 1-2-1z" />
        <path d="M9 8h6" />
      </Icon>
    ),
  },
  {
    title: 'Search by meaning',
    body: 'Type "that call about the budget" and find the note even if it never says "budget". Plain keyword search is one tap away too.',
    icon: (
      <Icon>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4.2-4.2" />
      </Icon>
    ),
  },
  {
    title: 'Share in a tap',
    body: 'Send any note to Apple Notes, Reminders, Messages, or any app that takes text, straight from your phone\'s share sheet.',
    icon: (
      <Icon>
        <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M8 10H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" />
      </Icon>
    ),
  },
  {
    title: 'A title when you want one',
    body: 'Add a short AI-written title before you share — edit it, or skip it and send the transcript as it is.',
    icon: (
      <Icon>
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
        <path d="M19 16v4M17 18h4" />
      </Icon>
    ),
  },
  {
    title: 'Export everything',
    body: 'Download as text, Markdown, CSV, or JSON — or as an Apple Notes import file for your Mac. Pick a few notes, or take them all.',
    icon: (
      <Icon>
        <path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14" />
      </Icon>
    ),
  },
  {
    title: 'Your audio, kept',
    body: 'Replay any recording, download the original, or upload audio you already have. Teach it new words, then re-run a note.',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5v7l5.5-3.5z" />
      </Icon>
    ),
  },
  {
    title: 'Fix it, sort it, finish it',
    body: 'Edit any transcript, color-code your notes, and check them off when they\'re done.',
    icon: (
      <Icon>
        <path d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3z" />
      </Icon>
    ),
  },
  {
    title: 'Select many, act once',
    body: 'Copy, share, export, or delete a whole batch at once. Deleted the wrong ones? Tap Undo and they\'re back.',
    icon: (
      <Icon>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
      </Icon>
    ),
  },
  {
    title: 'Feels like an app',
    body: 'Add Telonote to your home screen and it opens full-screen, like a native app — no download, no app store.',
    icon: (
      <Icon>
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <path d="M11 18.5h2" />
      </Icon>
    ),
  },
]

export default function Features() {
  return (
    <section className="border-t border-border bg-surface/60" aria-labelledby="features-heading">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Everything else
          </span>
          <h2 id="features-heading" className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            More than a voice memo
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">
            Getting the words right is the start. Here's what happens after.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="rounded-2xl border border-border bg-surface p-6">
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                {feature.icon}
              </span>
              <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
