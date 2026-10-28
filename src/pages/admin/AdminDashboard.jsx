import React, { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Lock, Plus, Unlock, Wallet, X, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate, todayKey } from '../../lib/dateUtils'
import Modal from '../../components/Modal'
import DashboardScene from '../../components/DashboardScene'

const parseAmount = (value) => Number(String(value || '').replaceAll('.', '').replace(',', '.')) || 0
const formatNumericInput = (value) => {
  const raw = String(value).replace(/[^0-9,]/g, '')
  const [whole, decimal] = raw.split(',')
  const formatted = (whole || '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimal === undefined ? formatted : `${formatted},${decimal}`
}

export default function AdminDashboard() {
  const { currentUser } = useAuth()
  const { lockDay, addTopup, requestCashInitialEdit, cancellationRequests, requestCashUnlock, cashUnlockRequests, getCashSummary, DEFAULT_INITIAL_CASH, cloudReady } = useData()
  const date = todayKey()
  const summary = getCashSummary(date)
  const isLocked = summary.status === 'locked'
  const [showInitialCash, setShowInitialCash] = useState(false)
  const [showCashEdit, setShowCashEdit] = useState(false)
  const [showCloseCash, setShowCloseCash] = useState(false)
  const [countedCashInput, setCountedCashInput] = useState('')
  const [closeCashError, setCloseCashError] = useState('')
  const [cashEditForm, setCashEditForm] = useState({ amount: '', reason: '' })
  const [cashEditError, setCashEditError] = useState('')
  const [showTopup, setShowTopup] = useState(false)
  const [showUnlockRequest, setShowUnlockRequest] = useState(false)
  const [showLowCash, setShowLowCash] = useState(true)
  const [initialCashInput, setInitialCashInput] = useState(() => formatNumericInput(DEFAULT_INITIAL_CASH))
  const [initialCashReason, setInitialCashReason] = useState('')
  const [initialCashError, setInitialCashError] = useState('')
  const [topupForm, setTopupForm] = useState({ amount: '', source: '', note: '' })
  const [topupError, setTopupError] = useState('')
  const [unlockReason, setUnlockReason] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const hasPendingUnlock = cashUnlockRequests.some((request) => request.date === date && request.status === 'pending')
  const pendingCashEdit = cancellationRequests.some((request) => request.kind === 'cashInitialEdit' && request.date === date && request.status === 'pending')
  const hasCashInitialRequest = cancellationRequests.some((request) => request.kind === 'cashInitialEdit' && request.date === date)

  useEffect(() => {
    if (!cloudReady || summary.exists || hasCashInitialRequest || !currentUser?.id) return
    const promptKey = `kebunkas_initial_cash_prompt_${currentUser.id}_${date}`
    if (window.localStorage.getItem(promptKey) === 'shown') return
    window.localStorage.setItem(promptKey, 'shown')
    setShowInitialCash(true)
  }, [cloudReady, summary.exists, hasCashInitialRequest, currentUser?.id, date])

  function handleSaveInitialCash(event) {
    event.preventDefault()
    const result = requestCashInitialEdit({ date, amount: parseAmount(initialCashInput), reason: initialCashReason, requestedBy: currentUser.id })
    if (!result.ok) return setInitialCashError(result.message)
    setShowInitialCash(false)
    setInitialCashReason('')
    setInitialCashError('')
  }

  function openCashEdit() {
    setCashEditForm({ amount: formatNumericInput(summary.initialAmount), reason: '' })
    setCashEditError('')
    setShowCashEdit(true)
  }

  function handleRequestCashEdit(event) {
    event.preventDefault()
    const result = requestCashInitialEdit({ date, amount: parseAmount(cashEditForm.amount), reason: cashEditForm.reason, requestedBy: currentUser.id })
    if (!result.ok) return setCashEditError(result.message)
    setShowCashEdit(false)
  }

  function openCloseCash() {
    setCountedCashInput(formatNumericInput(String(Math.max(0, summary.remaining))))
    setCloseCashError('')
    setShowCloseCash(true)
  }

  function handleCloseCash(event) {
    event.preventDefault()
    const result = lockDay(date, currentUser.id, parseAmount(countedCashInput))
    if (!result?.ok) return setCloseCashError(result?.message || 'Kas gagal ditutup.')
    setShowCloseCash(false)
    setCloseCashError('')
  }

  function handleAddTopup(event) {
    event.preventDefault()
    setTopupError('')
    if (parseAmount(topupForm.amount) <= 0) return setTopupError('Jumlah top-up harus lebih dari 0.')
    const now = new Date()
    addTopup({ date, time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, amount: parseAmount(topupForm.amount), source: topupForm.source, note: topupForm.note, adminId: currentUser.id })
    setTopupForm({ amount: '', source: '', note: '' })
    setTopupError('')
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

  return <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-9">
    <section className="dashboard-hero relative mb-6 overflow-hidden rounded-[1.75rem] bg-plantation-950 px-5 py-6 text-white shadow-soft sm:px-8 sm:py-8">
      <DashboardScene />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-6 pb-12 sm:pb-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/80"><CalendarDays size={14} className="text-gold-300" />{formatShortDate(date)}</span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[.2em] text-gold-300">Ruang operasional admin</p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">Kas hari ini</h1>
          <p className="mt-2 text-sm text-white/65">Selamat bertugas, {currentUser.name}. Kelola saldo dan penutupan kas harian.</p>
        </div>
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="min-w-40 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3 backdrop-blur-sm"><p className="text-xs text-white/60">Status kas</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">{isLocked ? <CheckCircle2 size={16} className="text-emerald-300" /> : <span className="h-2 w-2 rounded-full bg-gold-300 shadow-[0_0_10px_rgba(252,211,77,.8)]" />}{isLocked ? 'Sudah ditutup' : summary.exists ? 'Kas aktif' : 'Belum diatur'}</p><p className="mt-1 text-xs text-white/55">Sisa {formatRupiah(summary.remaining)}</p></div>
          {summary.exists && <button disabled={isLocked && hasPendingUnlock} onClick={() => (isLocked ? setShowUnlockRequest(true) : openCloseCash())} className={isLocked ? 'inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50' : 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-semibold text-plantation-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-gold-300'}>{isLocked ? <Unlock size={16} /> : <Lock size={16} />}{isLocked ? (hasPendingUnlock ? 'Menunggu owner' : 'Ajukan buka kas') : 'Tutup kas harian'}</button>}
        </div>
      </div>
    </section>
    {isLocked && <div className="mb-6 rounded-md border border-gold-500/30 bg-gold-400/10 px-4 py-3 text-sm text-plantation-900">Kas hari ini sudah ditutup. Transaksi baru dan penghapusan transaksi tidak tersedia sampai kas dibuka kembali.</div>}
    {!summary.exists && pendingCashEdit && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-gold-500/30 bg-gold-400/10 px-4 py-3 text-sm text-plantation-900"><span>Pengajuan kas awal sebelumnya masih tercatat menunggu. Jika belum diproses, admin bisa mengirim pengajuan baru.</span><button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setShowInitialCash(true)}>Ajukan ulang kas awal</button></div>}
    <section className="cash-summary card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><div className="flex items-center gap-3 text-plantation-900"><span className="cash-summary-icon"><Wallet size={17} /></span><div><h2 className="text-sm font-medium text-ink-700">Ringkasan dana operasional</h2><p className="text-xs text-ink-500 mt-0.5">Pembelian via kas dan pinjaman mengurangi saldo; modal stok batu dihitung terpisah.</p></div></div>{!isLocked && <div className="flex flex-wrap gap-2">{summary.exists ? <><button type="button" className="btn-ghost !py-1.5 !px-3 text-xs" onClick={openCashEdit}><Wallet size={14} />{pendingCashEdit ? 'Ajukan ulang kas awal' : 'Ajukan ubah kas awal'}</button><button className="btn-gold !py-1.5 !px-3 text-xs" onClick={() => setShowTopup(true)}><Plus size={14} /> Tambah kas</button></> : pendingCashEdit ? <button type="button" className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => setShowInitialCash(true)}><ShieldCheck size={14} /> Ajukan ulang kas awal</button> : <button type="button" className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => setShowInitialCash(true)}><ShieldCheck size={14} /> Ajukan kas awal</button>}</div>}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><CashStat label="Kas awal" value={formatRupiah(summary.initialAmount)} /><CashStat label="Top-up" value={formatRupiah(summary.totalTopup)} /><CashStat label="Pembelian via kas" value={formatRupiah(summary.totalPurchaseUsed)} /><CashStat label="Pinjaman" value={formatRupiah(summary.totalLoans)} /><CashStat label="Sisa kas" value={formatRupiah(summary.remaining)} highlight tone={summary.remaining < 0 ? 'text-red-700' : 'text-gold-700'} /></div>
      {showLowCash && summary.remaining < 1_000_000 && <div className="low-cash-alert mt-4" role="alert"><div><p className="font-medium">Sisa kas hampir habis</p><p className="text-xs mt-0.5">Sisa kas di bawah Rp1.000.000. Tambahkan kas agar transaksi tetap lancar.</p></div><button type="button" onClick={() => setShowLowCash(false)} className="low-cash-close" aria-label="Tutup pemberitahuan"><X size={16} /></button></div>}
      {summary.topups.length > 0 && <div className="mt-4 pt-4 border-t border-ink-900/8 space-y-1.5">{summary.topups.map((topup) => <div key={topup.id} className="flex justify-between gap-4 text-xs text-ink-500"><span>{topup.time} — top-up{topup.source ? ` dari ${topup.source}` : ''}{topup.note ? ` (${topup.note})` : ''}</span><span className="shrink-0 text-ink-700 font-medium">+{formatRupiah(topup.amount)}</span></div>)}</div>}
    </section>
    <Modal open={showInitialCash} onClose={() => setShowInitialCash(false)} title="Ajukan kas awal ke owner"><form onSubmit={handleSaveInitialCash} className="space-y-4"><p className="text-sm text-ink-600">Kas awal belum diatur. Pengajuan ini akan menunggu persetujuan owner sebelum saldo dipakai.</p><div><label className="label" htmlFor="initial-cash-amount">Jumlah kas awal (Rp)</label><input id="initial-cash-amount" type="text" inputMode="numeric" className="input" value={initialCashInput} onChange={(event) => setInitialCashInput(formatNumericInput(event.target.value))} autoFocus required /></div><div><label className="label" htmlFor="initial-cash-reason">Alasan / keterangan</label><textarea id="initial-cash-reason" className="input min-h-24" value={initialCashReason} onChange={(event) => { setInitialCashReason(event.target.value); setInitialCashError('') }} placeholder="Contoh: kas awal operasional hari ini" required /></div>{initialCashError && <p role="alert" className="text-sm text-red-700">{initialCashError}</p>}<button type="submit" className="btn-primary w-full"><ShieldCheck size={16} /> Kirim ke owner</button></form></Modal>
    <Modal open={showCashEdit} onClose={() => setShowCashEdit(false)} title="Ajukan perubahan kas awal"><form onSubmit={handleRequestCashEdit} className="space-y-4"><p className="text-sm text-ink-600">Nilai kas awal tidak langsung berubah. Owner perlu menyetujui permintaan ini terlebih dahulu.</p><div><label className="label" htmlFor="cash-edit-amount">Kas awal baru (Rp)</label><input id="cash-edit-amount" type="text" inputMode="numeric" className="input" value={cashEditForm.amount} onChange={(event) => setCashEditForm({ ...cashEditForm, amount: formatNumericInput(event.target.value) })} autoFocus required /><p className="mt-1 text-xs text-ink-500">Saat ini: {formatRupiah(summary.initialAmount)}</p></div><div><label className="label" htmlFor="cash-edit-reason">Alasan perubahan</label><textarea id="cash-edit-reason" className="input min-h-24" value={cashEditForm.reason} onChange={(event) => { setCashEditForm({ ...cashEditForm, reason: event.target.value }); setCashEditError('') }} placeholder="Contoh: koreksi jumlah kas awal" required /></div>{cashEditError && <p role="alert" className="text-sm text-red-700">{cashEditError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setShowCashEdit(false)}>Batal</button><button type="submit" className="btn-primary"><ShieldCheck size={16} /> Kirim ke owner</button></div></form></Modal>
    <Modal open={showTopup} onClose={() => { setShowTopup(false); setTopupError('') }} title="Tambah kas (top-up)"><form onSubmit={handleAddTopup} className="space-y-4"><div><label className="label" htmlFor="topup-amount">Jumlah tambahan (Rp) *</label><input id="topup-amount" type="text" inputMode="numeric" className="input" value={topupForm.amount} onChange={(event) => { setTopupForm({ ...topupForm, amount: formatNumericInput(event.target.value) }); setTopupError('') }} placeholder="mis. 20.000.000" autoFocus required /><p className="mt-2 text-xs text-plantation-700">Jumlah tambahan: <b>{formatRupiah(parseAmount(topupForm.amount))}</b></p></div><div><label className="label">Sumber dana (opsional)</label><input className="input" value={topupForm.source} onChange={(event) => setTopupForm({ ...topupForm, source: event.target.value })} placeholder="mis. transfer dari owner" /></div><div><label className="label">Catatan (opsional)</label><input className="input" value={topupForm.note} onChange={(event) => setTopupForm({ ...topupForm, note: event.target.value })} placeholder="mis. kas awal habis jam 14.00" /></div>{topupError && <p role="alert" className="text-sm text-red-700">{topupError}</p>}<button type="submit" className="btn-gold w-full">Tambahkan ke kas</button></form></Modal>
    <Modal open={showCloseCash} onClose={() => setShowCloseCash(false)} title="Tutup kas hari ini">
      <form onSubmit={handleCloseCash} className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-600">Hitung uang tunai yang tersisa, lalu masukkan jumlah fisiknya. Owner akan melihat angka sistem dan selisihnya di ringkasan laporan brondolan.</p>
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-plantation-900/10 bg-plantation-50/70 p-4">
          <div><p className="text-xs text-ink-500">Sisa menurut sistem</p><p className="mt-1 font-display text-lg text-plantation-900">{formatRupiah(summary.remaining)}</p></div>
          <div><p className="text-xs text-ink-500">Hitungan fisik</p><p className="mt-1 font-display text-lg text-plantation-900">{formatRupiah(parseAmount(countedCashInput))}</p></div>
          <div className="col-span-2 border-t border-plantation-900/10 pt-3"><p className="text-xs text-ink-500">Selisih kas</p><p className={`mt-1 font-semibold ${parseAmount(countedCashInput) - summary.remaining < 0 ? 'text-red-700' : 'text-plantation-800'}`}>{parseAmount(countedCashInput) - summary.remaining > 0 ? '+' : ''}{formatRupiah(parseAmount(countedCashInput) - summary.remaining)}</p></div>
        </div>
        <div><label className="label" htmlFor="counted-cash">Uang kas fisik tersisa (Rp)</label><input id="counted-cash" inputMode="numeric" className="input" value={countedCashInput} onChange={(event) => { setCountedCashInput(formatNumericInput(event.target.value)); setCloseCashError('') }} autoFocus required /></div>
        {closeCashError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{closeCashError}</p>}
        <div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setShowCloseCash(false)}>Batal</button><button type="submit" className="btn-primary"><Lock size={16} /> Simpan &amp; tutup kas</button></div>
      </form>
    </Modal>
    <Modal open={showUnlockRequest} onClose={() => { setShowUnlockRequest(false); setUnlockError('') }} title="Ajukan buka kas"><form onSubmit={handleUnlockRequest} className="space-y-4"><p className="text-sm text-ink-700">Kas hanya dapat dibuka kembali setelah owner menyetujui permintaan ini.</p><div><label className="label" htmlFor="unlock-reason">Alasan buka kas</label><textarea id="unlock-reason" className="input min-h-24" value={unlockReason} onChange={(event) => { setUnlockReason(event.target.value); setUnlockError('') }} placeholder="Contoh: ada transaksi yang belum tercatat" autoFocus /></div>{unlockError && <p className="text-sm text-red-700">{unlockError}</p>}<button type="submit" className="btn-primary w-full"><Unlock size={16} /> Kirim permintaan</button></form></Modal>
  </div>
}

function CashStat({ label, value, highlight, tone = '' }) { return <div className={`cash-stat rounded-xl border shadow-sm ${highlight ? 'border-gold-500/30 bg-gold-400/10' : 'border-plantation-900/10 bg-white'}`}><p className="text-xs font-medium text-ink-500">{label}</p><p className={`mt-1 font-display leading-tight ${highlight ? 'text-2xl' : 'text-xl'} ${tone}`}>{value}</p></div> }
