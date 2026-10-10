import React, { useState } from 'react'
import { Lock, Plus, Unlock, Wallet, X, HandCoins, Trash2 } from 'lucide-react'
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
  const { setInitialCash, lockDay, addTopup, addCashLoan, deleteCashLoan, requestCashUnlock, cashUnlockRequests, getCashSummary, DEFAULT_INITIAL_CASH } = useData()
  const date = todayKey()
  const summary = getCashSummary(date)
  const isLocked = summary.status === 'locked'
  const [showInitialCash, setShowInitialCash] = useState(!summary.exists)
  const [showTopup, setShowTopup] = useState(false)
  const [showLoan, setShowLoan] = useState(false)
  const [loanDeleteTarget, setLoanDeleteTarget] = useState(null)
  const [showUnlockRequest, setShowUnlockRequest] = useState(false)
  const [showLowCash, setShowLowCash] = useState(true)
  const [initialCashInput, setInitialCashInput] = useState(() => formatNumericInput(DEFAULT_INITIAL_CASH))
  const [topupForm, setTopupForm] = useState({ amount: '', source: '', note: '' })
  const [loanForm, setLoanForm] = useState({ name: '', amount: '', reason: '' })
  const [loanError, setLoanError] = useState('')
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

  function handleAddLoan(event) {
    event.preventDefault()
    const result = addCashLoan({ date, ...loanForm, amount: parseAmount(loanForm.amount), adminId: currentUser.id })
    if (!result.ok) return setLoanError(result.message)
    setLoanForm({ name: '', amount: '', reason: '' })
    setLoanError('')
    setShowLoan(false)
  }

  function handleDeleteLoan() {
    if (!loanDeleteTarget) return
    const result = deleteCashLoan(loanDeleteTarget.id, currentUser.id)
    if (!result.ok) return setLoanError(result.message)
    setLoanDeleteTarget(null)
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><div className="flex items-center gap-3 text-plantation-900"><span className="cash-summary-icon"><Wallet size={17} /></span><div><h2 className="text-sm font-medium text-ink-700">Ringkasan dana operasional</h2><p className="text-xs text-ink-500 mt-0.5">Pembelian dan pinjaman tercatat sebagai kas keluar.</p></div></div>{!isLocked && <div className="flex gap-2"><button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => { setLoanError(''); setShowLoan(true) }}><HandCoins size={14} /> Catat pinjaman</button><button className="btn-gold !py-1.5 !px-3 text-xs" onClick={() => setShowTopup(true)}><Plus size={14} /> Tambah kas</button></div>}</div>
      <div className="cash-stats grid grid-cols-2 md:grid-cols-5"><CashStat label="Kas awal" value={formatRupiah(summary.initialAmount)} /><CashStat label="Top-up" value={formatRupiah(summary.totalTopup)} /><CashStat label="Pembelian" value={formatRupiah(summary.totalUsed)} /><CashStat label="Pinjaman" value={formatRupiah(summary.totalLoans)} /><CashStat label="Sisa kas" value={formatRupiah(summary.remaining)} highlight tone={summary.remaining < 0 ? 'text-red-700' : 'text-plantation-700'} /></div>
      {showLowCash && summary.remaining < 1_000_000 && <div className="low-cash-alert mt-4" role="alert"><div><p className="font-medium">Sisa kas hampir habis</p><p className="text-xs mt-0.5">Sisa kas di bawah Rp1.000.000. Tambahkan kas agar transaksi tetap lancar.</p></div><button type="button" onClick={() => setShowLowCash(false)} className="low-cash-close" aria-label="Tutup pemberitahuan"><X size={16} /></button></div>}
      {summary.topups.length > 0 && <div className="mt-4 pt-4 border-t border-ink-900/8 space-y-1.5">{summary.topups.map((topup) => <div key={topup.id} className="flex justify-between gap-4 text-xs text-ink-500"><span>{topup.time} — top-up{topup.source ? ` dari ${topup.source}` : ''}{topup.note ? ` (${topup.note})` : ''}</span><span className="shrink-0 text-ink-700 font-medium">+{formatRupiah(topup.amount)}</span></div>)}</div>}
    </section>
    <section className="card mt-5 overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-900/8 px-5 py-4"><div><h2 className="text-sm font-semibold text-ink-700">Pinjaman dari kas hari ini</h2><p className="mt-1 text-xs text-ink-500">Pencatatan mengurangi saldo kas secara otomatis.</p></div><HandCoins size={19} className="text-gold-600" /></div>
      {summary.loans.length === 0 ? <p className="px-5 py-10 text-center text-sm text-ink-500">Belum ada pinjaman kas pada tanggal ini.</p> : <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="table-head">Nama</th><th className="table-head">Jumlah uang</th><th className="table-head">Alasan</th><th className="table-head">Aksi</th></tr></thead><tbody>{summary.loans.map((loan) => <tr key={loan.id}><td className="table-cell font-medium">{loan.name}</td><td className="table-cell font-semibold text-plantation-900">{formatRupiah(loan.amount)}</td><td className="table-cell">{loan.reason}</td><td className="table-cell"><button type="button" disabled={isLocked || loan.adminId !== currentUser.id} onClick={() => { setLoanError(''); setLoanDeleteTarget(loan) }} className="rounded-md p-2 text-ink-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40" title={isLocked ? 'Kas ditutup' : loan.adminId !== currentUser.id ? 'Hanya pencatat pinjaman yang dapat menghapusnya' : 'Hapus pinjaman'} aria-label={`Hapus pinjaman ${loan.name}`}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>}
    </section>
    <Modal open={showInitialCash} onClose={() => setShowInitialCash(false)} title="Kas awal hari ini"><form onSubmit={handleSaveInitialCash}><label className="label">Jumlah kas awal (Rp)</label><input type="text" inputMode="numeric" className="input" value={initialCashInput} onChange={(event) => setInitialCashInput(formatNumericInput(event.target.value))} autoFocus /><p className="text-xs text-ink-500 mt-2">Masukkan kas yang tersedia hari ini. Isi 0 jika belum ada kas.</p><button type="submit" className="btn-primary w-full mt-5">Simpan kas awal</button></form></Modal>
    <Modal open={!!loanDeleteTarget} onClose={() => setLoanDeleteTarget(null)} title="Hapus pinjaman kas?"><div className="space-y-4"><p className="text-sm leading-relaxed text-ink-700">Pinjaman <b>{loanDeleteTarget?.name}</b> sebesar <b>{formatRupiah(loanDeleteTarget?.amount)}</b> akan dihapus. Saldo kas akan dihitung ulang dan catatan ini hilang dari laporan owner.</p>{loanError && <p role="alert" className="text-sm text-red-700">{loanError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setLoanDeleteTarget(null)}>Batal</button><button type="button" className="btn-danger" onClick={handleDeleteLoan}><Trash2 size={16} /> Hapus pinjaman</button></div></div></Modal>
    <Modal open={showTopup} onClose={() => setShowTopup(false)} title="Tambah kas (top-up)"><form onSubmit={handleAddTopup} className="space-y-4"><div><label className="label">Jumlah tambahan (Rp)</label><input type="text" inputMode="numeric" className="input" value={topupForm.amount} onChange={(event) => setTopupForm({ ...topupForm, amount: formatNumericInput(event.target.value) })} placeholder="mis. 20000000" autoFocus /><p className="mt-2 text-xs text-plantation-700">Jumlah tambahan: <b>{formatRupiah(parseAmount(topupForm.amount))}</b></p></div><div><label className="label">Sumber dana (opsional)</label><input className="input" value={topupForm.source} onChange={(event) => setTopupForm({ ...topupForm, source: event.target.value })} placeholder="mis. transfer dari owner" /></div><div><label className="label">Catatan (opsional)</label><input className="input" value={topupForm.note} onChange={(event) => setTopupForm({ ...topupForm, note: event.target.value })} placeholder="mis. kas awal habis jam 14.00" /></div><button type="submit" className="btn-gold w-full">Tambahkan ke kas</button></form></Modal>
    <Modal open={showLoan} onClose={() => setShowLoan(false)} title="Catat pinjaman kas"><form onSubmit={handleAddLoan} className="space-y-4"><p className="text-sm text-ink-600">Sisa kas saat ini: <b className="text-plantation-900">{formatRupiah(summary.remaining)}</b></p><div><label className="label" htmlFor="loan-name">Nama peminjam</label><input id="loan-name" className="input" value={loanForm.name} onChange={(event) => setLoanForm({ ...loanForm, name: event.target.value })} placeholder="Contoh: Anton" autoFocus required /></div><div><label className="label" htmlFor="loan-amount">Jumlah pinjaman (Rp)</label><input id="loan-amount" className="input" inputMode="numeric" value={loanForm.amount} onChange={(event) => setLoanForm({ ...loanForm, amount: formatNumericInput(event.target.value) })} placeholder="Contoh: 500.000" required /><p className="mt-1 text-xs text-ink-500">Saldo setelah pinjaman: {formatRupiah(summary.remaining - parseAmount(loanForm.amount))}</p></div><div><label className="label" htmlFor="loan-reason">Alasan pinjaman</label><textarea id="loan-reason" className="input min-h-24" value={loanForm.reason} onChange={(event) => setLoanForm({ ...loanForm, reason: event.target.value })} placeholder="Contoh: kebutuhan keluarga" required /></div>{loanError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{loanError}</p>}<button type="submit" className="btn-primary w-full"><HandCoins size={16} /> Simpan pinjaman dan kurangi kas</button></form></Modal>
    <Modal open={showUnlockRequest} onClose={() => { setShowUnlockRequest(false); setUnlockError('') }} title="Ajukan buka kas"><form onSubmit={handleUnlockRequest} className="space-y-4"><p className="text-sm text-ink-700">Kas hanya dapat dibuka kembali setelah owner menyetujui permintaan ini.</p><div><label className="label" htmlFor="unlock-reason">Alasan buka kas</label><textarea id="unlock-reason" className="input min-h-24" value={unlockReason} onChange={(event) => { setUnlockReason(event.target.value); setUnlockError('') }} placeholder="Contoh: ada transaksi yang belum tercatat" autoFocus /></div>{unlockError && <p className="text-sm text-red-700">{unlockError}</p>}<button type="submit" className="btn-primary w-full"><Unlock size={16} /> Kirim permintaan</button></form></Modal>
  </div>
}

function CashStat({ label, value, highlight, tone = '' }) { return <div className={`cash-stat ${highlight ? 'cash-stat-highlight' : ''}`}><p className="text-xs text-ink-500">{label}</p><p className={`font-display text-lg mt-0.5 ${tone}`}>{value}</p></div> }
