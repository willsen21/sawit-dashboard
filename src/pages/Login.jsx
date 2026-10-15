import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Leaf } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export default function Login() {
  const { currentUser, login, authReady, cloudMode } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [sendingRecovery, setSendingRecovery] = useState(false)

  if (!authReady) return <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">Memeriksa sesi...</div>
  if (currentUser) {
    return <Navigate to={currentUser.role === 'owner' ? '/owner' : '/admin'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const result = await login(username, password)
    if (!result.ok) {
      setError(result.message)
      return
    }
    sessionStorage.setItem('welcome-user', result.user.name)
    navigate(result.user.role === 'owner' ? '/owner' : '/admin')
  }

  async function handlePasswordRecovery(e) {
    e.preventDefault()
    setRecoveryError('')
    setRecoveryMessage('')
    if (!isSupabaseConfigured) {
      setRecoveryError('Pemulihan kata sandi hanya tersedia untuk akun cloud.')
      return
    }
    setSendingRecovery(true)
    const redirectTo = `${window.location.origin}${window.location.pathname}#/reset-password`
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), { redirectTo })
      if (resetError) {
        const detail = resetError.message || 'Kesalahan tidak diketahui.'
        const normalized = detail.toLowerCase()
        if (normalized.includes('redirect') || normalized.includes('url')) {
          setRecoveryError(`Alamat tujuan pemulihan belum diizinkan di Supabase. Tambahkan ${redirectTo} pada Authentication → URL Configuration → Redirect URLs. Detail: ${detail}`)
        } else if (normalized.includes('rate') || normalized.includes('limit') || normalized.includes('too many')) {
          setRecoveryError(`Supabase membatasi pengiriman email sementara. Tunggu sebelum mencoba lagi. Detail: ${detail}`)
        } else {
          setRecoveryError(`Supabase menolak permintaan pemulihan. Detail: ${detail}`)
        }
        return
      }
      setRecoveryMessage('Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk dan folder spam.')
    } catch (resetError) {
      setRecoveryError(`Permintaan pemulihan gagal tersambung ke Supabase. Periksa koneksi internet lalu coba lagi. Detail: ${resetError?.message || 'Kesalahan jaringan.'}`)
    } finally {
      setSendingRecovery(false)
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-paper-50">
      <div className="login-visual relative hidden overflow-hidden md:flex flex-col justify-between bg-plantation-950 text-paper-50 p-12">
        <img src="https://images.unsplash.com/photo-1672385896578-470b10319a67?auto=format&fit=crop&w=1400&q=85" alt="Hamparan kebun sawit" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-plantation-950/75 via-plantation-950/60 to-plantation-950/90" />
        <div className="login-brand relative flex items-center gap-2.5">
          <Leaf className="text-gold-400" size={22} />
          <span className="font-display text-xl">Kebun Kas</span>
        </div>
        <div className="login-copy relative max-w-sm">
          <h1 className="font-display text-4xl leading-[1.15] text-paper-50">
            “Setiap panen yang tercatat rapi, menumbuhkan usaha yang lebih pasti.”
          </h1>
          <p className="mt-4 text-paper-100/60 text-[15px] leading-relaxed">
            Catat setiap pembelian dengan mudah, pantau kas dengan jelas, dan jalankan kebun dengan lebih percaya diri.
          </p>
        </div>
        <p className="relative text-xs text-paper-100/55">Pencatatan pembelian sawit yang lebih teratur.</p>
      </div>

      <div className="flex items-center justify-center bg-paper-100/60 p-6 md:p-10">
        <div className="login-panel w-full max-w-sm rounded-2xl border border-ink-900/10 bg-white p-6 shadow-soft md:p-8">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <Leaf className="text-gold-500" size={22} />
            <span className="font-display text-xl text-plantation-950">Kebun Kas</span>
          </div>

          <h2 className="text-2xl font-display text-plantation-950">Selamat datang</h2>
          <p className="text-sm text-ink-500 mt-1.5 mb-6">Masukkan akun Anda untuk melanjutkan.</p>

          <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="label">Nama pengguna</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mis. admin1 atau papa"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Kata sandi</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input pr-11" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-500 hover:text-plantation-700" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'} title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

          <button type="submit" className="btn-primary w-full mt-6">
            Masuk
          </button>
          </form>
          <details className="mt-5 border-t border-ink-900/10 pt-4">
            <summary className="cursor-pointer text-center text-sm font-medium text-plantation-700 hover:text-plantation-900">Lupa kata sandi?</summary>
            <form onSubmit={handlePasswordRecovery} className="mt-4 space-y-3">
              <p className="text-sm leading-relaxed text-ink-500">Masukkan email yang terdaftar pada akun owner. Kami akan mengirim tautan untuk membuat kata sandi baru.</p>
              <input type="email" className="input" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="Email akun owner" required />
              {recoveryError && <p className="text-sm text-red-700">{recoveryError}</p>}
              {recoveryMessage && <p className="text-sm text-plantation-700">{recoveryMessage}</p>}
              <button type="submit" className="btn-secondary w-full" disabled={sendingRecovery}>{sendingRecovery ? 'Mengirim...' : 'Kirim tautan pemulihan'}</button>
            </form>
          </details>
        </div>
      </div>
    </div>
  )
}
