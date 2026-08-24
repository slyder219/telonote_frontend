import { useState } from 'react'
import Button from './Button'

const TERMS = ['TruePeak', 'Wren']

function MicQuoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ContextDemo() {
  const [hasContext, setHasContext] = useState(false)

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            See it in action
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Teach it once. It never mishears again.
          </h2>
          <p className="mt-3 text-ink-soft">
            Add a name or term to your context, and Telonote gets it right in every note from then on.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-start gap-2 text-sm text-ink-soft">
            <MicQuoteIcon />
            <p className="italic">"Remember to call TruePeak about Wren's system design."</p>
          </div>

          <div className="mt-5 rounded-xl bg-paper p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              {hasContext ? 'With context' : 'Without context'}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">
              Remember to call{' '}
              {hasContext ? (
                <span className="rounded bg-brand-50 px-1 font-medium text-brand-700">TruePeak</span>
              ) : (
                <span className="rounded bg-red-500/10 px-1 text-red-600 line-through decoration-red-400">
                  True Peak
                </span>
              )}{' '}
              about{' '}
              {hasContext ? (
                <span className="rounded bg-brand-50 px-1 font-medium text-brand-700">Wren</span>
              ) : (
                <span className="rounded bg-red-500/10 px-1 text-red-600 line-through decoration-red-400">Ren</span>
              )}
              's system design.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {TERMS.map((term) => (
              <span
                key={term}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  hasContext ? 'bg-brand-500 text-white' : 'border border-border text-ink-soft'
                }`}
              >
                {hasContext ? <CheckIcon /> : <PlusIcon />}
                {term}
              </span>
            ))}
          </div>

          <div className="mt-5 flex justify-center">
            <Button type="button" variant={hasContext ? 'secondary' : 'primary'} onClick={() => setHasContext((v) => !v)}>
              {hasContext ? 'Reset' : 'Add these to context'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
