import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Logo from './Logo'
import Button from './Button'

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NotesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ContextIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-2.5 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:text-ink'
  }`

const tabLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
    isActive ? 'text-brand-400' : 'text-ink-soft'
  }`

const APP_ROUTES = ['/dashboard', '/context', '/subscription']

export default function Navbar() {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const { pathname } = useLocation()
  const isOnAppRoute = APP_ROUTES.some((route) => pathname.startsWith(route))

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-paper/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>

          {isLoading ? null : isAuthenticated ? (
            <>
              {/* Full pill nav — plenty of horizontal room past mobile widths. */}
              <div className="hidden items-center gap-1 sm:flex">
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/context" className={navLinkClass}>
                  My Context
                </NavLink>
                <NavLink to="/subscription" className={navLinkClass}>
                  Subscription
                </NavLink>
                <Button variant="secondary" className="!px-3.5 !py-2 !text-sm" onClick={logout}>
                  Log out
                </Button>
              </div>
              {/* Mobile: primary nav lives in the bottom tab bar instead —
                  fitting "Dashboard" / "My Context" / "Subscription" pills
                  plus Log out into one top row doesn't fit without wrapping. */}
              <button
                type="button"
                onClick={logout}
                aria-label="Log out"
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors active:bg-surface sm:hidden"
              >
                <LogoutIcon />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" className="!px-3 !py-2">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" className="!px-4 !py-2">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </header>

      {!isLoading && isAuthenticated && isOnAppRoute && (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-paper/95 backdrop-blur sm:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <NavLink to="/dashboard" className={tabLinkClass}>
            <NotesIcon />
            Notes
          </NavLink>
          <NavLink to="/context" className={tabLinkClass}>
            <ContextIcon />
            Context
          </NavLink>
          <NavLink to="/subscription" className={tabLinkClass}>
            <PlanIcon />
            Plan
          </NavLink>
        </nav>
      )}
    </>
  )
}
