import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingSpinner fullPage />
  if (!user || profile?.role !== 'admin') return <Navigate to="/login" replace />
  return <Outlet />
}
