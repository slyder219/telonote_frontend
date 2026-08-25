import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/60">
      {/* Extra bottom padding on mobile so this stays reachable below the
          fixed bottom tab bar shown on authenticated app pages — a bit of
          unused whitespace on public pages beats content getting covered. */}
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 pb-24 pt-8 text-sm text-ink-soft sm:flex-row sm:justify-between sm:pb-8">
        <Logo />
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link to="/pricing" className="hover:text-ink">
            Pricing
          </Link>
          <Link to="/terms" className="hover:text-ink">
            Terms of Service
          </Link>
          <Link to="/privacy" className="hover:text-ink">
            Privacy Policy
          </Link>
          <Link to="/refunds" className="hover:text-ink">
            Refund Policy
          </Link>
          <a href="mailto:telonote@truepeak.us" className="hover:text-ink">
            telonote@truepeak.us
          </a>
        </nav>
        <p className="text-xs text-ink-soft">© {new Date().getFullYear()} Telonote</p>
      </div>
    </footer>
  )
}
