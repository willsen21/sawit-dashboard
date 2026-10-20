import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleAlert, Eye, EyeOff, Leaf, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from '../components/LoadingScreen'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export default function Login() {
  const { currentUser, login, authReady, cloudMode } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [sendingRecovery, setSendingRecovery] = useState(false)

  if (!authReady) return <LoadingScreen />
  if (currentUser) return <Navigate to={currentUser.role === 'owner' ? '/owner' : '/admin'} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return
    setError('')
    setIsSubmitting(true)
    try {
      const result = await login(username.trim(), password)
      if (!result.ok) {
        setError(result.message)
        return
      }
      sessionStorage.setItem('welcome-user', result.user.name)
      navigate(result.user.role === 'owner' ? '/owner' : '/admin')
    } catch {
      setError('Login belum berhasil. Periksa koneksi internet lalu coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePasswordRecovery(event) {
    event.preventDefault()
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

  return <main className="login-page min-h-screen bg-paper-50 md:grid md:grid-cols-[1.05fr_.95fr]">
    <section className="login-visual relative hidden min-h-screen overflow-hidden bg-plantation-950 p-10 text-white md:flex md:flex-col md:justify-between lg:p-14">
      <img src="https://images.unsplash.com/photo-1672385896578-470b10319a67?auto=format&fit=crop&w=1600&q=85" alt="Hamparan kebun sawit" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(9,34,26,.42),rgba(9,34,26,.88))]" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-gold-300 backdrop-blur"><Leaf size={22} /></span>
        <div><p className="font-display text-xl">Kebun Kas</p><p className="mt-0.5 text-[11px] tracking-[.18em] text-white/55">SAWIT MANAGEMENT</p></div>
      </div>
      <div className="relative max-w-xl py-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/80 backdrop-blur"><SparkleMark /> Catat rapi, kelola pasti</span>
        <h1 className="mt-7 max-w-lg font-display text-5xl leading-[1.08] text-white lg:text-6xl">Semua hasil kebun, <span className="text-gold-300">lebih mudah dipantau.</span></h1>
        <p className="mt-5 max-w-md text-base leading-7 text-white/70">Satu ruang kerja untuk transaksi, laporan, stok, dan catatan panen harian.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <FeaturePill icon={<ShieldCheck size={15} />} label="Akses akun terlindungi" />
          <FeaturePill icon={<Leaf size={15} />} label="Data kebun teratur" />
        </div>
      </div>
      <p className="relative text-xs text-white/50">Ruang kerja digital untuk usaha kebun Anda.</p>
      <div className="login-orbit pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full border border-white/10" />
      <div className="login-orbit login-orbit-delay pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full border border-gold-300/20" />
    </section>

    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 md:px-10 lg:px-16">
      <div className="login-glow pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" />
      <div className="login-panel relative w-full max-w-md">
        <div className="mb-8 flex items-center gap-3 md:hidden">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-plantation-950 text-gold-300 shadow-sm"><Leaf size={22} /></span>
          <div><p className="font-display text-xl text-plantation-950">Kebun Kas</p><p className="text-[10px] tracking-[.16em] text-ink-400">SAWIT MANAGEMENT</p></div>
        </div>

        <div className="mb-7">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.22em] text-gold-700">Ruang kerja Anda</p>
          <h2 className="font-display text-4xl leading-tight text-plantation-950 sm:text-[2.65rem]">Selamat datang.</h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-ink-500">Masuk untuk melihat kegiatan dan laporan kebun hari ini.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-ink-900/8 bg-white p-5 shadow-[0_24px_70px_rgba(17,45,35,.08)] sm:p-7">
          <div className="space-y-5">
            <div>
              <label className="label mb-2" htmlFor="login-username">Nama pengguna</label>
              <div className="relative">
                <UserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                <input id="login-username" type="text" autoComplete="username" className="input h-[3.25rem] pl-11" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Masukkan nama pengguna" autoFocus required disabled={isSubmitting} />
              </div>
            </div>
            <div>
              <label className="label mb-2" htmlFor="login-password">Kata sandi</label>
              <div className="relative">
                <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="input h-[3.25rem] pl-11 pr-12" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" required disabled={isSubmitting} />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-ink-400 transition hover:text-plantation-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plantation-700" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'} title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}><span className="sr-only">{showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}</span>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
          </div>

          {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-800"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</p>}

          <button type="submit" className="login-submit mt-6 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-plantation-950 px-4 font-semibold text-white shadow-[0_8px_18px_rgba(17,45,35,.16)] transition hover:-translate-y-0.5 hover:bg-plantation-800 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plantation-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-75" disabled={isSubmitting || !username.trim() || !password}>
            {isSubmitting ? <><LoaderCircle size={18} className="animate-spin" />Memeriksa akun...</> : <>Masuk ke dashboard <ArrowRight size={18} /></>}
          </button>
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-ink-400"><ShieldCheck size={14} className="text-plantation-700" />{cloudMode ? 'Akun Anda tersimpan dengan aman' : 'Akses ruang kerja Kebun Kas'}</div>

          <details className="mt-6 border-t border-ink-900/8 pt-4">
            <summary className="cursor-pointer list-none text-center text-sm font-medium text-plantation-800 transition hover:text-plantation-950"><span className="inline-flex items-center gap-2"><Mail size={15} /> Lupa kata sandi?</span></summary>
            <form onSubmit={handlePasswordRecovery} className="mt-4 space-y-3">
              <p className="text-sm leading-relaxed text-ink-500">Masukkan email yang terdaftar pada akun owner untuk menerima tautan pemulihan.</p>
              <label className="sr-only" htmlFor="recovery-email">Email akun owner</label>
              <input id="recovery-email" type="email" autoComplete="email" className="input" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} placeholder="Email akun owner" required />
              {recoveryError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{recoveryError}</p>}
              {recoveryMessage && <p role="status" className="rounded-xl bg-plantation-50 px-3 py-2 text-sm text-plantation-800">{recoveryMessage}</p>}
              <button type="submit" className="btn-secondary w-full" disabled={sendingRecovery}>{sendingRecovery ? <><LoaderCircle size={16} className="animate-spin" />Mengirim...</> : 'Kirim tautan pemulihan'}</button>
            </form>
          </details>
        </form>
        <p className="mt-6 text-center text-[11px] text-ink-400">Dengan masuk, Anda menggunakan akun resmi Kebun Kas.</p>
      </div>
    </section>
  </main>
}

function FeaturePill({ icon, label }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white/85 backdrop-blur">{icon}{label}</span>
}

function SparkleMark() {
  return <span className="h-1.5 w-1.5 rounded-full bg-gold-300 shadow-[0_0_10px_rgba(227,177,85,.9)]" aria-hidden="true" />
}
