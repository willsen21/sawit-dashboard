import React, { useState } from 'react'
import { Lock, Plus, Unlock, Wallet, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate, todayKey } from '../../lib/dateUtils'
import Modal from '../../components/Modal'

const parseAmount = (value) => Number(String(value || '').replaceAll('.', '').replace(',', '.')) || 0
const formatNumericInput = (value) => {
  const raw = String(value).replace(/[^0-9,]/g, '')
  const [whole, decimal] = raw.split(',')
  const formatted = (whole || '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimal === undefined ? formatted : `${formatted},${decimal}`
}

export default function AdminDashboard() {
  const { currentUser } = useAuth()
  const { setInitialCash, lockDay, addTopup, requestCashUnlock, cashUnlockRequests, getCashSummary, DEFAULT_INITIAL_CASH } = useData()
  const date = todayKey()
  const summary = getCashSummary(date)
  const isLocked = summary.status === 'locked'
  const [showInitialCash, setShowInitialCash] = useState(!summary.exists)
  const [showTopup, setShowTopup] = useState(false)
  const [showUnlockRequest, setShowUnlockRequest] = useState(false)
  const [showLowCash, setShowLowCash] = useState(true)
  const [initialCashInput, setInitialCashInput] = useState(() => formatNumericInput(DEFAULT_INITIAL_CASH))
  const [topupForm, setTopupForm] = useState({ amount: '', source: '', note: '' })
  const [unlockReason, setUnlockReason] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const hasPendingUnlock = cashUnlockRequests.some((request) => request.date === date && request.status === 'pending')

  function handleSaveInitialCash(event) {
    event.preventDefault()
    setInitialCash(date, currentUser.id, parseAmount(initialCashInput))
    setShowInitialCash(false)
  }

  function handleAddTopup(event) {
    event.preventDefault()
    if (parseAmount(topupForm.amount) <= 0) return
    const now = new Date()
    addTopup({ date, time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, amount: parseAmount(topupForm.amount), source: topupForm.source, note: topupForm.note, adminId: currentUser.id })
    setTopupForm({ amount: '', source: '', note: '' })
    setShowTopup(false)
  }

  function handleUnlockRequest(event) {
    event.preventDefault()
    if (!unlockReason.trim()) return setUnlockError('Alasan buka kas wajib diisi.')
    const result = requestCashUnlock({ date, reason: unlockReason, requestedBy: currentUser.id })
    if (!result.ok) return setUnlockError(result.message)
    setShowUnlockRequest(false)
    setUnlockReason('')
    setUnlockError('')
  }

  return <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Operasional</p><h1 className="text-2xl font-display mt-1">Kas Hari Ini</h1><p className="text-sm text-ink-500 mt-1">{formatShortDate(date)} — {currentUser.name}</p></div>
      {summary.exists && <button disabled={isLocked && hasPendingUnlock} onClick={() => (isLocked ? setShowUnlockRequest(true) : lockDay(date, currentUser.id))} className={isLocked ? 'btn-ghost' : 'btn-primary'}>{isLocked ? <Unlock size={16} /> : <Lock size={16} />}{isLocked ? (hasPendingUnlock ? 'Menunggu Persetujuan Owner' : 'Ajukan Buka Kas') : 'Tutup Kas Harian'}</button>}
    </div>
    {isLocked && <div className="mb-6 rounded-md border border-gold-500/30 bg-gold-400/10 px-4 py-3 text-sm text-plantation-900">Kas hari ini sudah ditutup. Transaksi baru dan penghapusan transaksi tidak tersedia sampai kas dibuka kembali.</div>}
    <section className="cash-summary card p-5">
      <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-3 text-plantation-900"><span className="cash-summary-icon"><Wallet size={17} /></span><div><h2 className="text-sm font-medium text-ink-700">Ringkasan dana operasional</h2><p className="text-xs text-ink-500 mt-0.5">Perbarui kas sebelum mencatat pembelian.</p></div></div>{!isLocked && <button className="btn-gold !py-1.5 !px-3 text-xs" onClick={() => setShowTopup(true)}><Plus size={14} /> Tambah kas</button>}</div>
      <div className="cash-stats grid grid-cols-2 md:grid-cols-4"><CashStat label="Kas awal" value={formatRupiah(summary.initialAmount)} /><CashStat label="Top-up" value={formatRupiah(summary.totalTopup)} /><CashStat label="Terpakai" value={formatRupiah(summary.totalUsed)} /><CashStat label="Sisa kas" value={formatRupiah(summary.remaining)} highlight tone={summary.remaining < 0 ? 'text-red-700' : 'text-plantation-700'} /></div>
      {showLowCash && summary.remaining < 1_000_000 && <div className="low-cash-alert mt-4" role="alert"><div><p className="font-medium">Sisa kas hampir habis</p><p className="text-xs mt-0.5">Sisa kas di bawah Rp1.000.000. Tambahkan kas agar transaksi tetap lancar.</p></div><button type="button" onClick={() => setShowLowCash(false)} className="low-cash-close" aria-label="Tutup pemberitahuan"><X size={16} /></button></div>}
      {summary.topups.length > 0 && <div className="mt-4 pt-4 border-t border-ink-900/8 space-y-1.5">{summary.topups.map((topup) => <div key={topup.id} className="flex justify-between gap-4 text-xs text-ink-500"><span>{topup.time} — top-up{topup.source ? ` dari ${topup.source}` : ''}{topup.note ? ` (${topup.note})` : ''}</span><span className="shrink-0 text-ink-700 font-medium">+{formatRupiah(topup.amount)}</span></div>)}</div>}
    </section>
    <Modal open={showInitialCash} onClose={() => setShowInitialCash(false)} title="Kas awal hari ini"><form onSubmit={handleSaveInitialCash}><label className="label">Jumlah kas awal (Rp)</label><input type="text" inputMode="numeric" className="input" value={initialCashInput} onChange={(event) => setInitialCashInput(formatNumericInput(event.target.value))} autoFocus /><p className="text-xs text-ink-500 mt-2">Biasanya Rp100.000.000. Ubah sesuai kas yang diterima hari ini.</p><button type="submit" className="btn-primary w-full mt-5">Simpan kas awal</button></form></Modal>
    <Modal open={showTopup} onClose={() => setShowTopup(false)} title="Tambah kas (top-up)"><form onSubmit={handleAddTopup} className="space-y-4"><div><label className="label">Jumlah tambahan (Rp)</label><input type="text" inputMode="numeric" className="input" value={topupForm.amount} onChange={(event) => setTopupForm({ ...topupForm, amount: formatNumericInput(event.target.value) })} placeholder="mis. 20000000" autoFocus /><p className="mt-2 text-xs text-plantation-700">Jumlah tambahan: <b>{formatRupiah(parseAmount(topupForm.amount))}</b></p></div><div><label className="label">Sumber dana (opsional)</label><input className="input" value={topupForm.source} onChange={(event) => setTopupForm({ ...topupForm, source: event.target.value })} placeholder="mis. transfer dari owner" /></div><div><label className="label">Catatan (opsional)</label><input className="input" value={topupForm.note} onChange={(event) => setTopupForm({ ...topupForm, note: event.target.value })} placeholder="mis. kas awal habis jam 14.00" /></div><button type="submit" className="btn-gold w-full">Tambahkan ke kas</button></form></Modal>
    <Modal open={showUnlockRequest} onClose={() => { setShowUnlockRequest(false); setUnlockError('') }} title="Ajukan buka kas"><form onSubmit={handleUnlockRequest} className="space-y-4"><p className="text-sm text-ink-700">Kas hanya dapat dibuka kembali setelah owner menyetujui permintaan ini.</p><div><label className="label" htmlFor="unlock-reason">Alasan buka kas</label><textarea id="unlock-reason" className="input min-h-24" value={unlockReason} onChange={(event) => { setUnlockReason(event.target.value); setUnlockError('') }} placeholder="Contoh: ada transaksi yang belum tercatat" autoFocus /></div>{unlockError && <p className="text-sm text-red-700">{unlockError}</p>}<button type="submit" className="btn-primary w-full"><Unlock size={16} /> Kirim permintaan</button></form></Modal>
  </div>
}

function CashStat({ label, value, highlight, tone = '' }) { return <div className={`cash-stat ${highlight ? 'cash-stat-highlight' : ''}`}><p className="text-xs text-ink-500">{label}</p><p className={`font-display text-lg mt-0.5 ${tone}`}>{value}</p></div> }
