import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Button from '../components/Button'

const steps = [
  {
    title: 'Record',
    body: 'Tap once to start, tap again to stop. No fiddling with settings — just talk.',
  },
  {
    title: 'Understand your context',
    body: 'Telonote vectors your names, jargon, and past notes to build a model of the vocabulary you actually use.',
  },
  {
    title: 'Transcribe',
    body: 'That context steers transcription word by word, so it gets the words a generic model would guess wrong.',
  },
  {
    title: 'Organize',
    body: 'Every note is saved and searchable, ready to edit, copy, or delete anytime.',
  },
]

export default function Landing() {
  const { isAuthenticated } = useAuth()

  return (
    <div>
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-16 pb-14 text-center sm:pt-24">
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-300/40" />
          <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-brand-400/40 [animation-delay:300ms]" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-brand-500/30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="3" width="6" height="12" rx="3" fill="#fff" />
              <path d="M6 11a6 6 0 0 0 12 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 17v3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          Context-aware transcription
        </span>

        <h1 className="mt-4 w-full text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Say it. We'll write it down — correctly.
        </h1>
        <p className="mt-4 w-full max-w-xl text-lg leading-relaxed text-ink-soft">
          Telonote isn't just another voice memo app. It vectors the names, jargon, and topics
          you actually use to find your most relevant vocabulary, then models your dictation
          against it — so transcripts read like you, not a generic guess.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {isAuthenticated ? (
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button fullWidth>Go to your dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/signup" className="w-full sm:w-auto">
                <Button fullWidth>Get started free</Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="secondary" fullWidth>
                  Log in
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="border-t border-border bg-surface/60">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-border bg-surface p-6">
              <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                {index + 1}
              </span>
              <h2 className="text-base font-semibold text-ink">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
