import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Leaf } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { currentUser, login, authReady, cloudMode } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-paper-50">
      <div className="relative hidden overflow-hidden md:flex flex-col justify-between bg-plantation-950 text-paper-50 p-12">
        <img src="https://images.unsplash.com/photo-1672385896578-470b10319a67?auto=format&fit=crop&w=1400&q=85" alt="Hamparan kebun sawit" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-plantation-950/75 via-plantation-950/60 to-plantation-950/90" />
        <div className="relative flex items-center gap-2.5">
          <Leaf className="text-gold-400" size={22} />
          <span className="font-display text-xl">Kebun Kas</span>
        </div>
        <div className="relative max-w-sm">
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
        <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-ink-900/10 bg-white p-6 shadow-soft md:p-8">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <Leaf className="text-gold-500" size={22} />
            <span className="font-display text-xl text-plantation-950">Kebun Kas</span>
          </div>

          <h2 className="text-2xl font-display text-plantation-950">Selamat datang</h2>
          <p className="text-sm text-ink-500 mt-1.5 mb-6">Masukkan akun Anda untuk melanjutkan.</p>

          <div className="space-y-4">
            <div>
              <label className="label">{cloudMode ? 'Email' : 'Username'}</label>
              <input
                type={cloudMode ? 'email' : 'text'}
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={cloudMode ? 'nama@contoh.com' : 'mis. admin1 / papa'}
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
      </div>
    </div>
  )
}
