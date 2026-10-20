import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute({ role, children }) {
  const { currentUser, authReady } = useAuth()

  if (!authReady) return <LoadingScreen />

  if (!currentUser) return <Navigate to="/login" replace />
  if (role && currentUser.role !== role) {
    return <Navigate to={currentUser.role === 'owner' ? '/owner' : '/admin'} replace />
  }
  return children
}
