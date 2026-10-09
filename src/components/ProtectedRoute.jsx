import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ role, children }) {
  const { currentUser, authReady } = useAuth()

  if (!authReady) return <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">Memeriksa sesi...</div>

  if (!currentUser) return <Navigate to="/login" replace />
  if (role && currentUser.role !== role) {
    return <Navigate to={currentUser.role === 'owner' ? '/owner' : '/admin'} replace />
  }
  return children
}
