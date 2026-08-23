import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-8 text-sm text-ink-soft sm:flex-row sm:justify-between">
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
          <a href="mailto:support@telonote.com" className="hover:text-ink">
            support@telonote.com
          </a>
        </nav>
        <p className="text-xs text-ink-soft">© {new Date().getFullYear()} Telonote</p>
      </div>
    </footer>
  )
}
