import { useAuth } from '../auth/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Welcome, {user?.name}
      </h1>
      <p className="mt-2 text-ink-soft">
        Recording and transcripts land here once Telonote is connected to the backend.
      </p>

      <button
        type="button"
        disabled
        className="mt-10 flex h-24 w-24 items-center justify-center rounded-full bg-brand-200 shadow-inner disabled:cursor-not-allowed"
        aria-label="Recording coming soon"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="9" y="3" width="6" height="12" rx="3" fill="#fff" />
          <path d="M6 11a6 6 0 0 0 12 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 17v3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <p className="mt-3 text-sm text-ink-soft">Recording — coming soon</p>
    </div>
  )
}
