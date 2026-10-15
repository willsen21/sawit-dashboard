import React, { useState } from 'react'
import { CheckCircle2, KeyRound } from 'lucide-react'
import Modal from './Modal'
import { useAuth } from '../context/AuthContext'

export default function ChangePasswordModal({ open, onClose }) {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  function close() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
    setSaving(false)
    onClose()
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (newPassword.length < 8) return setError('Kata sandi baru minimal 8 karakter.')
    if (newPassword !== confirmPassword) return setError('Konfirmasi kata sandi baru belum sama.')
    if (newPassword === currentPassword) return setError('Gunakan kata sandi baru yang berbeda.')

    setSaving(true)
    const result = await changePassword(currentPassword, newPassword)
    setSaving(false)
    if (!result.ok) return setError(result.message)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess(true)
  }

  return <Modal open={open} onClose={close} title="Ubah kata sandi">
    {success ? <div className="space-y-4"><p className="flex items-center gap-2 text-sm text-plantation-800"><CheckCircle2 size={18} /> Kata sandi berhasil diubah.</p><div className="flex justify-end"><button type="button" className="btn-primary" onClick={close}>Selesai</button></div></div> : <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-ink-600">Masukkan kata sandi lama, lalu buat kata sandi baru minimal 8 karakter.</p>
      <div><label className="label" htmlFor="current-password">Kata sandi lama</label><input id="current-password" className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoFocus /></div>
      <div><label className="label" htmlFor="new-password">Kata sandi baru</label><input id="new-password" className="input" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></div>
      <div><label className="label" htmlFor="confirm-password">Ulangi kata sandi baru</label><input id="confirm-password" className="input" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={close}>Batal</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan…' : <><KeyRound size={16} /> Simpan kata sandi</>}</button></div>
    </form>}
  </Modal>
}
