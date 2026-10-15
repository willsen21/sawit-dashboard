import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import AdminDashboard from './pages/admin/AdminDashboard'
import PurchaseForm from './pages/admin/PurchaseForm'
import PurchaseHistory from './pages/admin/PurchaseHistory'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import Reports from './pages/owner/Reports'
import CashLoanReport from './pages/owner/CashLoanReport'
import ManageAdmins from './pages/owner/ManageAdmins'
import PurchaseDetails from './pages/owner/PurchaseDetails'
import TransactionControls from './pages/owner/TransactionControls'
import Operations from './pages/owner/Operations'
import PrivateFarms from './pages/owner/PrivateFarms'
import StoneSales from './pages/admin/StoneSales'
import Stones from './pages/owner/Stones'
import { SHOW_FRUIT_PURCHASES } from './config/features'

const defaultPurchaseKind = SHOW_FRUIT_PURCHASES ? 'buah' : 'brondolan'

function RootRedirect() {
  const { currentUser, authReady } = useAuth()
  if (!authReady) return <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">Memeriksa sesi...</div>
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
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AppLayout role="admin" />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="batu" element={<StoneSales />} />
            <Route path="catat-pembelian" element={<Navigate to={`/admin/catat-pembelian/${defaultPurchaseKind}`} replace />} />
            <Route path="catat-pembelian/buah" element={SHOW_FRUIT_PURCHASES ? <PurchaseForm /> : <Navigate to="/admin/catat-pembelian/brondolan" replace />} />
            <Route path="catat-pembelian/brondolan" element={<PurchaseForm />} />
            <Route path="pembelian-hari-ini" element={<Navigate to={`/admin/pembelian/${defaultPurchaseKind}`} replace />} />
            <Route path="pembelian/buah" element={SHOW_FRUIT_PURCHASES ? <PurchaseHistory /> : <Navigate to="/admin/pembelian/brondolan" replace />} />
            <Route path="pembelian/brondolan" element={<PurchaseHistory />} />
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
            <Route path="batu" element={<Stones />} />
            <Route path="operasional" element={<Operations />} />
            <Route path="kebun-pribadi" element={<PrivateFarms />} />
            <Route path="laporan" element={<Navigate to={`/owner/laporan/${defaultPurchaseKind}`} replace />} />
            <Route path="laporan/pinjaman" element={<CashLoanReport />} />
            <Route path="laporan/buah" element={SHOW_FRUIT_PURCHASES ? <Reports /> : <Navigate to="/owner/laporan/brondolan" replace />} />
            <Route path="laporan/brondolan" element={<Reports />} />
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
