import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import PurchaseForm from './pages/admin/PurchaseForm'
import PurchaseHistory from './pages/admin/PurchaseHistory'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import Reports from './pages/owner/Reports'
import ManageAdmins from './pages/owner/ManageAdmins'
import PurchaseDetails from './pages/owner/PurchaseDetails'
import TransactionControls from './pages/owner/TransactionControls'
import Operations from './pages/owner/Operations'
import PrivateFarms from './pages/owner/PrivateFarms'

function RootRedirect() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  return <Navigate to={currentUser.role === 'owner' ? '/owner' : '/admin'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AppLayout role="admin" />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="catat-pembelian" element={<PurchaseForm />} />
            <Route path="pembelian-hari-ini" element={<PurchaseHistory />} />
          </Route>

          <Route
            path="/owner"
            element={
              <ProtectedRoute role="owner">
                <AppLayout role="owner" />
              </ProtectedRoute>
            }
          >
            <Route index element={<OwnerDashboard />} />
            <Route path="operasional" element={<Operations />} />
            <Route path="kebun-pribadi" element={<PrivateFarms />} />
            <Route path="laporan" element={<Reports />} />
            <Route path="pembelian/:period" element={<PurchaseDetails />} />
            <Route path="admin" element={<ManageAdmins />} />
            <Route path="kontrol-transaksi" element={<TransactionControls />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DataProvider>
    </AuthProvider>
  )
}
