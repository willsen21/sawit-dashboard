import React, { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, CircleAlert, Clock3, Plus, Wallet, HandCoins, FileX2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate, todayKey } from '../../lib/dateUtils'
import { useParams } from 'react-router-dom'
import Modal from '../../components/Modal'

const CVS = ['Sinar Mandiri', 'Jaya Agung']
const parseAmount = (value) => Number(String(value || '').replaceAll('.', '').replace(',', '.')) || 0
const formatNumericInput = (value) => String(value).replace(/[^0-9,]/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export default function PurchaseForm() {
  const { kind: routeKind } = useParams()
  const kind = routeKind === 'brondolan' ? 'brondolan' : 'buah'
  const { currentUser } = useAuth()
  const { addTransaction, transactions, getCashSummary, requestCashUnlock, cashUnlockRequests, requestCashInitialEdit, cancellationRequests, addCashLoan, requestCashLoanDeletion } = useData()
  const [date, setDate] = useState(todayKey())
  const summary = getCashSummary(date)
  const isLocked = summary.status === 'locked'
  const isBackdated = date < todayKey()
  const pendingUnlock = cashUnlockRequests.some((request) => request.date === date && request.status === 'pending')
  const pendingCashSetup = cancellationRequests.some((request) => request.kind === 'cashInitialEdit' && request.date === date && request.status === 'pending')
  const [form, setForm] = useState({ name: '', cv: CVS[0], paymentStatus: 'paid', paymentMethod: 'cash', grossKg: '', netKg: '', pricePerKg: '', note: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showUnlockRequest, setShowUnlockRequest] = useState(false)
  const [showCashSetupRequest, setShowCashSetupRequest] = useState(false)
  const [cashSetupForm, setCashSetupForm] = useState({ amount: '', reason: '' })
  const [cashSetupError, setCashSetupError] = useState('')
  const [unlockReason, setUnlockReason] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [showLoan, setShowLoan] = useState(false)
  const [loanForm, setLoanForm] = useState({ name: '', amount: '', reason: '' })
  const [loanError, setLoanError] = useState('')
  const [loanSuccess, setLoanSuccess] = useState('')
  const [loanDeleteTarget, setLoanDeleteTarget] = useState(null)
  const [loanDeleteReason, setLoanDeleteReason] = useState('')
  const [loanDeleteError, setLoanDeleteError] = useState('')
  const total = parseAmount(form.netKg) * parseAmount(form.pricePerKg)
  const dailyRows = transactions.filter((item) => item.date === date && (item.kind || 'buah') === kind && item.status !== 'voided').sort((a, b) => (b.time || '').localeCompare(a.time || ''))
  const externalPayment = form.paymentMethod === 'transfer'
  const loans = summary.loans || []
  const dailyEntries = [
    ...dailyRows.map((item) => ({ type: 'purchase', item, sortAt: new Date(`${date}T${item.time || '00:00'}:00`).getTime() })),
    ...(kind === 'brondolan' ? loans.map((item) => ({ type: 'loan', item, sortAt: new Date(item.createdAt).getTime() })) : []),
  ].sort((a, b) => b.sortAt - a.sortAt)

  useEffect(() => {
    if (!success) return undefined
    const timer = window.setTimeout(() => setSuccess(''), 4000)
    return () => window.clearTimeout(timer)
  }, [success])

  function savePurchase(event) {
    event.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Nama penjual wajib diisi.')
    if (parseAmount(form.grossKg) <= 0) return setError('Berat kotor harus lebih dari 0.')
    if (parseAmount(form.netKg) <= 0) return setError('Berat bersih harus lebih dari 0.')
    if (parseAmount(form.netKg) > parseAmount(form.grossKg)) return setError('Berat bersih tidak boleh lebih besar dari berat kotor.')
    if (parseAmount(form.pricePerKg) <= 0) return setError('Harga per kg harus lebih dari 0.')
    if (!externalPayment && !summary.exists) return setError('Kas awal tanggal ini belum diatur. Ajukan kas awal ke owner terlebih dahulu.')
    if (!externalPayment && isLocked) return setError('Kas tanggal ini ditutup. Ajukan buka kas kepada owner terlebih dahulu.')
    if (!externalPayment && total > summary.remaining) return setError(`Sisa kas tidak cukup. Kas tersedia: ${formatRupiah(summary.remaining)}.`)
    const now = new Date()
    addTransaction({ date, time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, kind, name: form.name.trim(), cv: kind === 'buah' ? form.cv : '', paymentStatus: form.paymentStatus, paymentMethod: form.paymentMethod, grossKg: parseAmount(form.grossKg), netKg: parseAmount(form.netKg), pricePerKg: parseAmount(form.pricePerKg), note: form.note, adminId: currentUser.id })
    setForm({ ...form, name: '', paymentMethod: 'cash', grossKg: '', netKg: '', pricePerKg: '', note: '' })
    setSuccess('Pembelian berhasil disimpan.')
  }

  function submitUnlockRequest(event) {
    event.preventDefault()
    if (!unlockReason.trim()) return setUnlockError('Alasan permintaan wajib diisi.')
    const result = requestCashUnlock({ date, reason: unlockReason.trim(), requestedBy: currentUser.id })
    if (!result.ok) return setUnlockError(result.message)
    setShowUnlockRequest(false)
    setUnlockReason('')
    setUnlockError('')
  }

  function submitCashSetupRequest(event) {
    event.preventDefault()
    const result = requestCashInitialEdit({ date, amount: parseAmount(cashSetupForm.amount), reason: cashSetupForm.reason, requestedBy: currentUser.id })
    if (!result.ok) return setCashSetupError(result.message)
    setShowCashSetupRequest(false)
    setCashSetupForm({ amount: '', reason: '' })
    setCashSetupError('')
  }

  function submitLoan(event) {
    event.preventDefault()
    const result = addCashLoan({ date, ...loanForm, amount: parseAmount(loanForm.amount), adminId: currentUser.id })
    if (!result.ok) return setLoanError(result.message)
    setLoanForm({ name: '', amount: '', reason: '' })
    setLoanError('')
    setShowLoan(false)
    setLoanSuccess(`Pinjaman untuk ${formatShortDate(date)} berhasil dicatat dan mengurangi kas hari tersebut.`)
  }

  function submitLoanDeletion(event) {
    event.preventDefault()
    if (!loanDeleteTarget) return
    const result = requestCashLoanDeletion({ cashLoanId: loanDeleteTarget.id, reason: loanDeleteReason, requestedBy: currentUser.id })
    if (!result.ok) return setLoanDeleteError(result.message)
    setLoanDeleteTarget(null)
    setLoanDeleteReason('')
    setLoanDeleteError('')
  }

  return <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">
    <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Transaksi · {kind === 'brondolan' ? 'Brondolan' : 'Buah'}</p><h1 className="text-2xl font-display mt-1">Catat Pembelian {kind === 'brondolan' ? 'Brondolan' : 'Buah'}</h1><p className="text-sm text-ink-500 mt-1">Pilih tanggal transaksi, lalu isi data pembelian.</p></div>
    <section className="card mb-5 p-4"><label className="label" htmlFor="purchase-date">Tanggal transaksi</label><div className="flex items-center gap-3"><CalendarDays size={18} className="shrink-0 text-plantation-700" /><input id="purchase-date" type="date" max={todayKey()} className="input" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); setError('') }} /></div><p className="mt-2 text-xs text-ink-500">Tanggal yang dipilih: <b>{formatShortDate(date)}</b>. Data akan masuk ke laporan pada tanggal ini.</p></section>
    {isBackdated && <div className="mb-5 rounded-lg border border-gold-500/30 bg-gold-400/10 px-4 py-3 text-sm text-plantation-900"><b>Pencatatan tanggal lampau.</b> Pastikan tanggal dan kas untuk hari tersebut benar sebelum menyimpan.</div>}
    {success && <div role="status" className="mb-5 flex w-full items-center gap-3 rounded-lg border border-plantation-700/25 bg-plantation-700/10 px-4 py-3 text-sm text-plantation-900"><CheckCircle2 size={19} className="shrink-0 text-plantation-700" /><span className="font-medium">{success}</span></div>}
    {loanSuccess && <div role="status" className="mb-5 rounded-lg border border-plantation-700/25 bg-plantation-700/10 px-4 py-3 text-sm text-plantation-900">{loanSuccess}</div>}
    <div className="mb-5 flex items-center gap-3 rounded-lg border border-plantation-900/10 bg-white px-4 py-3 shadow-soft"><span className="cash-summary-icon !h-8 !w-8"><Wallet size={15} /></span><div className="flex-1"><p className="text-xs text-ink-500">Kas tersedia untuk transaksi</p><p className="font-display text-lg text-plantation-900">{formatRupiah(summary.remaining)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isLocked ? 'bg-gold-400/15 text-gold-600' : 'bg-plantation-700/10 text-plantation-700'}`}>{isLocked ? 'Kas ditutup' : 'Kas terbuka'}</span></div>
    {(isLocked && !externalPayment) && <div className="mb-4 rounded-lg border border-gold-500/30 bg-gold-400/10 p-4 text-sm text-plantation-900"><CircleAlert size={18} className="mr-2 inline -mt-0.5" />Kas tanggal {formatShortDate(date)} sedang ditutup.{pendingUnlock ? <p className="mt-2 font-medium">Permintaan buka kas sudah dikirim dan menunggu persetujuan owner.</p> : <button type="button" onClick={() => { setUnlockReason(''); setUnlockError(''); setShowUnlockRequest(true) }} className="btn-ghost mt-3 !px-3 !py-2 text-xs">Ajukan buka kas tanggal ini</button>}</div>}
    {(!summary.exists && !externalPayment) && <div className="mb-4 rounded-lg border border-gold-500/30 bg-gold-400/10 p-4 text-sm text-plantation-900"><CircleAlert size={18} className="mr-2 inline -mt-0.5" />Kas awal untuk {formatShortDate(date)} belum diatur. {pendingCashSetup ? <p className="mt-2 font-medium">Permintaan kas awal sudah dikirim dan menunggu persetujuan owner.</p> : <button type="button" onClick={() => { setCashSetupForm({ amount: '', reason: '' }); setCashSetupError(''); setShowCashSetupRequest(true) }} className="btn-ghost mt-3 !px-3 !py-2 text-xs">Ajukan kas awal ke owner</button>}</div>}
    <form onSubmit={savePurchase} className="card p-5 md:p-6"><div className="grid gap-5 md:grid-cols-2"><Field label="Nama penjual"><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="mis. Pak Andi" autoFocus /></Field>{kind === 'buah' ? <Field label="CV"><select className="input" value={form.cv} onChange={(event) => setForm({ ...form, cv: event.target.value })}>{CVS.map((cv) => <option key={cv}>{cv}</option>)}</select></Field> : <Field label="Harga per kg bersih (Rp)"><input type="text" inputMode="numeric" className="input" value={form.pricePerKg} onChange={(event) => setForm({ ...form, pricePerKg: formatNumericInput(event.target.value) })} placeholder="mis. 2.300" /></Field>}<Field label="Metode pembayaran"><select className="input" value={form.paymentMethod} onChange={(event) => { setForm({ ...form, paymentMethod: event.target.value }); setError('') }}><option value="cash">Kas Kebun</option><option value="transfer">Transfer</option></select></Field><Field label="Berat kotor (kg)"><input type="text" inputMode="decimal" className="input" value={form.grossKg} onChange={(event) => setForm({ ...form, grossKg: formatNumericInput(event.target.value) })} placeholder="mis. 1.250" /></Field><Field label="Berat bersih (kg)"><input type="text" inputMode="decimal" className="input" value={form.netKg} onChange={(event) => setForm({ ...form, netKg: formatNumericInput(event.target.value) })} placeholder="mis. 1.210" /></Field><div><p className="label">Status pembayaran</p><PaymentPicker value={form.paymentStatus} onChange={(paymentStatus) => setForm({ ...form, paymentStatus })} /></div>{kind === 'buah' && <Field label="Harga per kg bersih (Rp)"><input type="text" inputMode="numeric" className="input" value={form.pricePerKg} onChange={(event) => setForm({ ...form, pricePerKg: formatNumericInput(event.target.value) })} placeholder="mis. 2.300" /></Field>}<Field label={kind === 'brondolan' ? 'Catatan (sebelah status)' : 'Catatan (opsional)'}><input className="input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="mis. potongan sortasi" /></Field></div><p className={`mt-4 rounded-md px-3 py-2 text-xs ${externalPayment ? 'bg-blue-50 text-blue-800' : 'bg-plantation-700/8 text-plantation-800'}`}>{externalPayment ? 'Dibayar melalui transfer; transaksi tetap tercatat tetapi tidak mengurangi kas kebun.' : 'Pembelian dibayar melalui Kas Kebun dan akan mengurangi saldo kas.'}</p><div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-ink-900/8 pt-5"><div><p className="text-xs text-ink-500">Total (berat bersih × harga/kg)</p><p className="font-display text-2xl text-plantation-900">{formatRupiah(total)}</p></div><button type="submit" className="btn-primary"><Plus size={16} /> Simpan pembelian</button></div>{error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}</form>
    <section className="card mt-5 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/10 px-5 py-4"><div><h2 className="text-sm font-semibold text-ink-800">Pembelian {kind === 'buah' ? 'buah' : 'brondolan'} hari ini · {formatShortDate(date)}</h2><p className="mt-1 text-xs text-ink-500">Semua pembelian tanggal ini ditampilkan. Transfer tidak mengurangi kas.{kind === 'brondolan' ? ' Pinjaman kas juga tercatat di tabel ini.' : ''}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-plantation-700/10 px-3 py-1 text-xs font-medium text-plantation-700">{dailyEntries.length} catatan</span><button type="button" disabled={isLocked || !summary.exists} onClick={() => { setLoanError(''); setLoanSuccess(''); setShowLoan(true) }} className="btn-primary !px-3 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"><HandCoins size={15} /> Catat pinjaman kas</button></div></div><div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="table-head">No.</th><th className="table-head">Waktu</th><th className="table-head">{kind === 'buah' ? 'CV' : 'Jenis'}</th><th className="table-head">Nama</th><th className="table-head">Status</th><th className="table-head">Metode</th><th className="table-head">Berat kotor</th><th className="table-head">Berat bersih</th><th className="table-head">Harga/kg</th><th className="table-head">Total / nominal</th><th className="table-head">Catatan / alasan</th>{kind === 'brondolan' && <th className="table-head">Aksi</th>}</tr></thead><tbody>{dailyEntries.length === 0 ? <tr><td colSpan={kind === 'brondolan' ? 12 : 11} className="table-cell py-8 text-center text-ink-500">Belum ada catatan pada tanggal ini.</td></tr> : dailyEntries.map(({ type, item }, index) => { if (type === 'loan') { const pendingDelete = cancellationRequests.some((request) => request.kind === 'cashLoanDeletion' && request.cashLoanId === item.id && request.status === 'pending'); const time = item.createdAt ? new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'; return <tr key={item.id} className="bg-gold-400/5"><td className="table-cell text-ink-500">{index + 1}</td><td className="table-cell">{time}</td><td className="table-cell"><span className="rounded-full bg-gold-400/15 px-2 py-1 text-xs font-medium text-gold-700">Pinjaman Kas</span></td><td className="table-cell font-medium">{item.name}</td><td className="table-cell">—</td><td className="table-cell">Kas keluar</td><td className="table-cell">—</td><td className="table-cell">—</td><td className="table-cell">—</td><td className="table-cell font-semibold text-plantation-900">{formatRupiah(item.amount)}</td><td className="table-cell">{item.reason}</td><td className="table-cell">{pendingDelete ? <span className="text-xs font-medium text-gold-600">Menunggu owner</span> : <button type="button" disabled={isLocked || item.adminId !== currentUser.id} onClick={() => { setLoanDeleteError(''); setLoanDeleteReason(''); setLoanDeleteTarget(item) }} className="rounded-md p-2 text-ink-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40" title={isLocked ? 'Kas ditutup' : item.adminId !== currentUser.id ? 'Hanya pencatat pinjaman yang dapat mengajukan penghapusan' : 'Ajukan penghapusan'} aria-label={`Ajukan penghapusan pinjaman ${item.name}`}><FileX2 size={16} /></button>}</td></tr> } return <tr key={item.id}><td className="table-cell text-ink-500">{index + 1}</td><td className="table-cell">{item.time || '—'}</td><td className="table-cell">{kind === 'buah' ? item.cv || '—' : 'Brondolan'}</td><td className="table-cell font-medium">{item.name || '—'}</td><td className="table-cell"><span className={`rounded-full px-2 py-1 text-xs font-medium ${(item.paymentStatus || 'paid') === 'unpaid' ? 'bg-gold-400/15 text-gold-600' : 'bg-plantation-700/10 text-plantation-700'}`}>{(item.paymentStatus || 'paid') === 'unpaid' ? 'Belum bayar' : 'Sudah bayar'}</span></td><td className="table-cell">{item.paymentMethod === 'transfer' ? 'Transfer' : 'Kas Kebun'}</td><td className="table-cell">{Number(item.grossKg ?? item.weightKg ?? 0).toLocaleString('id-ID')} kg</td><td className="table-cell">{Number(item.netKg ?? item.weightKg ?? 0).toLocaleString('id-ID')} kg</td><td className="table-cell">{formatRupiah(item.pricePerKg)}</td><td className="table-cell font-medium">{formatRupiah(item.total)}</td><td className="table-cell">{item.note || '—'}</td>{kind === 'brondolan' && <td className="table-cell">—</td>}</tr> })}</tbody></table></div></section>
    <Modal open={showUnlockRequest} onClose={() => setShowUnlockRequest(false)} title={`Ajukan buka kas ${formatShortDate(date)}`}><form onSubmit={submitUnlockRequest} className="space-y-4"><p className="text-sm text-ink-700">Owner perlu membuka kas tanggal ini sebelum pembelian lampau dapat dicatat.</p><div><label className="label" htmlFor="purchase-unlock-reason">Alasan</label><textarea id="purchase-unlock-reason" className="input min-h-24" value={unlockReason} onChange={(event) => { setUnlockReason(event.target.value); setUnlockError('') }} placeholder="Contoh: pembelian tanggal tersebut belum sempat dicatat" required autoFocus /></div>{unlockError && <p role="alert" className="text-sm text-red-700">{unlockError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setShowUnlockRequest(false)}>Batal</button><button type="submit" className="btn-primary"><CircleAlert size={16} /> Kirim permintaan</button></div></form></Modal>
    <Modal open={showCashSetupRequest} onClose={() => setShowCashSetupRequest(false)} title={`Ajukan kas awal ${formatShortDate(date)}`}><form onSubmit={submitCashSetupRequest} className="space-y-4"><p className="text-sm text-ink-700">Owner menetapkan kas awal tanggal ini terlebih dahulu. Setelah disetujui, Anda dapat melanjutkan pencatatan pembelian.</p><div><label className="label" htmlFor="historical-cash-amount">Kas awal yang diusulkan (Rp)</label><input id="historical-cash-amount" type="text" inputMode="numeric" className="input" value={cashSetupForm.amount} onChange={(event) => setCashSetupForm({ ...cashSetupForm, amount: formatNumericInput(event.target.value) })} placeholder="mis. 10.000.000" required autoFocus /></div><div><label className="label" htmlFor="historical-cash-reason">Alasan / keterangan</label><textarea id="historical-cash-reason" className="input min-h-24" value={cashSetupForm.reason} onChange={(event) => { setCashSetupForm({ ...cashSetupForm, reason: event.target.value }); setCashSetupError('') }} placeholder="Contoh: input transaksi yang tertinggal tanggal ini" required /></div>{cashSetupError && <p role="alert" className="text-sm text-red-700">{cashSetupError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setShowCashSetupRequest(false)}>Batal</button><button type="submit" className="btn-primary">Kirim ke owner</button></div></form></Modal>
    <Modal open={showLoan} onClose={() => setShowLoan(false)} title={`Catat pinjaman kas · ${formatShortDate(date)}`}><form onSubmit={submitLoan} className="space-y-4"><p className="text-sm text-ink-600">Sisa kas pada tanggal ini: <b className="text-plantation-900">{formatRupiah(summary.remaining)}</b>. Pinjaman langsung mengurangi saldo tersebut.</p><div><label className="label" htmlFor="purchase-loan-name">Nama peminjam</label><input id="purchase-loan-name" className="input" value={loanForm.name} onChange={(event) => setLoanForm({ ...loanForm, name: event.target.value })} placeholder="Contoh: Anton" autoFocus required /></div><div><label className="label" htmlFor="purchase-loan-amount">Jumlah pinjaman (Rp)</label><input id="purchase-loan-amount" className="input" inputMode="numeric" value={loanForm.amount} onChange={(event) => setLoanForm({ ...loanForm, amount: formatNumericInput(event.target.value) })} placeholder="Contoh: 500.000" required /><p className="mt-1 text-xs text-ink-500">Sisa kas setelah pinjaman: {formatRupiah(summary.remaining - parseAmount(loanForm.amount))}</p></div><div><label className="label" htmlFor="purchase-loan-reason">Alasan pinjaman</label><textarea id="purchase-loan-reason" className="input min-h-24" value={loanForm.reason} onChange={(event) => setLoanForm({ ...loanForm, reason: event.target.value })} placeholder="Contoh: kebutuhan keluarga" required /></div>{loanError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{loanError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setShowLoan(false)}>Batal</button><button type="submit" className="btn-primary"><HandCoins size={16} /> Simpan pinjaman</button></div></form></Modal>
    <Modal open={!!loanDeleteTarget} onClose={() => { setLoanDeleteTarget(null); setLoanDeleteError('') }} title="Ajukan penghapusan pinjaman"><form onSubmit={submitLoanDeletion} className="space-y-4"><p className="text-sm leading-relaxed text-ink-700">Permintaan menghapus pinjaman <b>{loanDeleteTarget?.name}</b> sebesar <b>{formatRupiah(loanDeleteTarget?.amount)}</b> dikirim ke owner. Catatan dan saldo kas tidak berubah sampai owner menyetujui.</p><div><label className="label" htmlFor="purchase-loan-delete-reason">Alasan penghapusan</label><textarea id="purchase-loan-delete-reason" className="input min-h-24" value={loanDeleteReason} onChange={(event) => { setLoanDeleteReason(event.target.value); setLoanDeleteError('') }} placeholder="Contoh: nominal pinjaman salah dicatat" required autoFocus /></div>{loanDeleteError && <p role="alert" className="text-sm text-red-700">{loanDeleteError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setLoanDeleteTarget(null)}>Batal</button><button type="submit" className="btn-danger"><FileX2 size={16} /> Kirim ke owner</button></div></form></Modal>
  </div>
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function PaymentPicker({ value, onChange }) { return <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => onChange('paid')} className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm font-medium ${value === 'paid' ? 'border-plantation-700 bg-plantation-700/10 text-plantation-700' : 'border-ink-900/10 text-ink-500'}`}><CheckCircle2 size={15} /> Sudah bayar</button><button type="button" onClick={() => onChange('unpaid')} className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm font-medium ${value === 'unpaid' ? 'border-gold-500 bg-gold-400/15 text-gold-600' : 'border-ink-900/10 text-ink-500'}`}><Clock3 size={15} /> Belum bayar</button></div> }
