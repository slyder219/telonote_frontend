import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Logo from './Logo'
import Button from './Button'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-2.5 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:text-ink'
  }`

export default function Navbar() {
  const { isAuthenticated, isLoading, logout } = useAuth()

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-paper/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        {isLoading ? null : isAuthenticated ? (
          <div className="flex items-center gap-1">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/context" className={navLinkClass}>
              My Context
            </NavLink>
            <Button variant="secondary" className="!px-3.5 !py-2 !text-sm" onClick={logout}>
              Log out
            </Button>
          </div>
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
  )
}
