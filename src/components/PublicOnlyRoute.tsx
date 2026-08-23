import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Spinner from './Spinner'

export default function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <Spinner />
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
