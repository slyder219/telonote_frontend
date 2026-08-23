function MicMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#223c4a" />
      <rect x="13" y="6" width="6" height="13" rx="3" fill="#fff" />
      <path d="M9 15a7 7 0 0 0 14 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 22v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
      <MicMark />
      Telonote
    </span>
  )
}
