interface QuotaRingProps {
  percentRemaining: number
  size: number
  strokeWidth?: number
}

/** A ring around the record button showing how much of today's quota is left — only meant to be rendered once you're in the warning zone (see WARNING_THRESHOLD in RecordButton). */
export default function QuotaRing({ percentRemaining, size, strokeWidth = 4 }: QuotaRingProps) {
  const clamped = Math.max(0, Math.min(1, percentRemaining))
  const isExhausted = clamped <= 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // At zero remaining, show a full ring (a clear "stop" signal) rather than
  // letting the arc shrink away to nothing right when it matters most.
  const dashOffset = circumference * (1 - (isExhausted ? 1 : clamped))
  const color = isExhausted ? '#ef4444' : '#f59e0b' // red-500 / amber-500

  return (
    <svg
      width={size}
      height={size}
      className="pointer-events-none absolute inset-0 -rotate-90"
      aria-hidden="true"
    >
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--color-border)" strokeWidth={strokeWidth} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 300ms ease' }}
      />
    </svg>
  )
}
