import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Logo from './Logo'
import Button from './Button'

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
            <Link to="/dashboard">
              <Button variant="ghost" className="!px-2.5 !py-2 !text-sm">
                Dashboard
              </Button>
            </Link>
            <Link to="/context">
              <Button variant="ghost" className="!px-2.5 !py-2 !text-sm">
                My Context
              </Button>
            </Link>
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
