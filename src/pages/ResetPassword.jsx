import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    if (!supabase) {
      setChecking(false)
      return () => { active = false }
    }
    supabase.auth.getSession().then(({ data }) => {
      if (active) setHasRecoverySession(Boolean(data.session))
    }).finally(() => {
      if (active) setChecking(false)
    })
    return () => { active = false }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 8) {
      setError('Kata sandi baru minimal 8 karakter.')
      return
    }
    if (password !== confirmation) {
      setError('Konfirmasi kata sandi belum sama.')
      return
    }
    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) {
      setError('Kata sandi gagal diperbarui. Minta tautan pemulihan baru lalu coba lagi.')
      return
    }
    await supabase.auth.signOut()
    setMessage('Kata sandi berhasil diubah. Silakan masuk kembali dengan kata sandi baru.')
    window.setTimeout(() => navigate('/login', { replace: true }), 1800)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-100/60 p-5">
      <section className="w-full max-w-md rounded-xl border border-ink-900/10 bg-white p-6 shadow-soft md:p-8">
        <h1 className="font-display text-2xl text-plantation-950">Buat kata sandi baru</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">Gunakan kata sandi baru untuk akun owner Anda.</p>
        {checking ? <p className="mt-6 text-sm text-ink-500">Memeriksa tautan pemulihan...</p> : hasRecoverySession ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Kata sandi baru</label>
              <input className="input" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <div>
              <label className="label">Ulangi kata sandi baru</label>
              <input className="input" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {message && <p className="text-sm text-plantation-700">{message}</p>}
            <button className="btn-primary w-full" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan kata sandi baru'}</button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg bg-red-50 p-3 text-sm leading-relaxed text-red-700">Tautan pemulihan tidak aktif atau sudah kedaluwarsa. Minta tautan baru dari halaman login.</p>
            <Link className="btn-primary w-full" to="/login">Kembali ke login</Link>
          </div>
        )}
      </section>
    </main>
  )
}
