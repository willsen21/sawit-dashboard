import React, { useState } from 'react'
import { KeyRound, Plus, PowerOff, Power, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'

export default function ManageAdmins() {
  const { admins, addAdmin, toggleAdminActive, resetAdminPassword } = useAuth()
  const [form, setForm] = useState({ name: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setError('Semua kolom wajib diisi.')
      return
    }
    const result = addAdmin(form)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setForm({ name: '', username: '', password: '' })
  }

  function handleResetPassword(e) {
    e.preventDefault()
    if (!newPassword.trim()) return
    resetAdminPassword(resetTarget.id, newPassword)
    setResetTarget(null)
    setNewPassword('')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Pengaturan akses</p><h1 className="mt-1 font-display text-2xl">Kelola Admin</h1><p className="mt-1 max-w-2xl text-sm text-ink-500">Buat akun operator dan atur aksesnya untuk pencatatan harian.</p></div><span className="hidden h-12 w-12 items-center justify-center rounded-xl bg-plantation-700/10 text-plantation-700 sm:flex"><ShieldCheck size={23} /></span></header>

      <form onSubmit={handleAdd} className="card mb-6 grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
        <div className="min-w-0">
          <label className="label">Nama</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="mis. Budi Santoso" />
        </div>
        <div className="min-w-0">
          <label className="label">Username</label>
          <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="mis. admin2" />
        </div>
        <div className="min-w-0">
          <label className="label">Kata sandi awal</label>
          <input type="password" minLength={6} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 karakter" />
        </div>
        <button type="submit" className="btn-primary w-full md:col-span-2 xl:col-span-1">
          <Plus size={16} /> Tambah admin
        </button>
        {error && <p className="text-sm text-red-700 md:col-span-2 xl:col-span-4">{error}</p>}
      </form>

      <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg text-plantation-950">Daftar akun</h2><span className="rounded-full bg-plantation-700/10 px-3 py-1 text-xs font-medium text-plantation-700">{admins.length} admin</span></div>
      <div className="grid gap-3 sm:hidden">
        {admins.map((a) => <article key={a.id} className="card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-ink-800">{a.name}</p><p className="mt-1 truncate font-mono text-xs text-ink-500">@{a.username}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${a.active ? 'bg-plantation-700/10 text-plantation-700' : 'bg-red-50 text-red-700'}`}>{a.active ? 'Aktif' : 'Nonaktif'}</span></div><div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink-900/8 pt-3"><button type="button" onClick={() => { setResetTarget(a); setNewPassword('') }} className="btn-ghost !px-2 !py-2 text-xs"><KeyRound size={14} />Reset sandi</button><button type="button" onClick={() => toggleAdminActive(a.id)} className="btn-ghost !px-2 !py-2 text-xs">{a.active ? <PowerOff size={14} /> : <Power size={14} />}{a.active ? 'Nonaktifkan' : 'Aktifkan'}</button></div></article>)}
        {admins.length === 0 && <div className="card p-6 text-center text-sm text-ink-500">Belum ada akun admin.</div>}
      </div>
      <div className="card hidden overflow-hidden sm:block">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-head">Nama</th>
              <th className="table-head">Username</th>
              <th className="table-head">Status</th>
              <th className="table-head"></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td className="table-cell font-medium">{a.name}</td>
                <td className="table-cell font-mono text-[13px]">{a.username}</td>
                <td className="table-cell">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${
                      a.active ? 'bg-plantation-700/10 text-plantation-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {a.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => {
                        setResetTarget(a)
                        setNewPassword('')
                      }}
                      className="text-ink-500 hover:text-plantation-800"
                      title="Reset kata sandi"
                    >
                      <KeyRound size={15} />
                    </button>
                    <button type="button"
                      onClick={() => toggleAdminActive(a.id)}
                      className="text-ink-500 hover:text-red-700"
                      title={a.active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {a.active ? <PowerOff size={15} /> : <Power size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset kata sandi — ${resetTarget?.name || ''}`}>
        <form onSubmit={handleResetPassword}>
          <label className="label">Kata sandi baru</label>
          <input type="password" minLength={6} required className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
          <button type="submit" className="btn-primary w-full mt-5">
            Simpan kata sandi
          </button>
        </form>
      </Modal>
    </div>
  )
}
