import React, { useState } from 'react'
import { CheckCircle2, ClipboardList, Clock3, FileX2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate, todayKey } from '../../lib/dateUtils'
import Modal from '../../components/Modal'


export default function PurchaseHistory() {
  const { currentUser } = useAuth()
  const { supplierMap, transactions, updateTransaction, requestCancellation, cancellationRequests, getCashSummary } = useData()
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [cancellationTarget, setCancellationTarget] = useState(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [requestError, setRequestError] = useState('')
  const date = todayKey()
  const summary = getCashSummary(date)
  const allRows = transactions.filter((item) => item.date === date).sort((a, b) => b.time.localeCompare(a.time))
  const rows = allRows.filter((item) => statusFilter === 'all' || (item.paymentStatus || 'paid') === statusFilter)
  const activeRows = allRows.filter((item) => item.status !== 'voided')
  const totalWeight = activeRows.reduce((sum, item) => sum + Number(item.netKg ?? item.weightKg ?? 0), 0)
  const isLocked = summary.status === 'locked'

  function confirmPayment() {
    if (!paymentTarget) return
    updateTransaction(paymentTarget.id, { paymentStatus: 'paid' }, currentUser.id)
    setPaymentTarget(null)
  }

  function submitCancellation(event) {
    event.preventDefault()
    if (!cancellationTarget || !cancellationReason.trim()) return setRequestError('Alasan pembatalan wajib diisi.')
    const result = requestCancellation({ transactionId: cancellationTarget.id, reason: cancellationReason, requestedBy: currentUser.id })
    if (!result.ok) return setRequestError(result.message)
    setCancellationTarget(null)
    setCancellationReason('')
    setRequestError('')
  }

  const hasPendingCancellation = (id) => cancellationRequests.some((request) => request.transactionId === id && request.status === 'pending')

  return <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Riwayat</p><h1 className="text-2xl font-display mt-1">Pembelian Hari Ini</h1><p className="text-sm text-ink-500 mt-1">{formatShortDate(date)} — seluruh transaksi yang telah dicatat.</p></div><div className="flex gap-3"><MiniStat label="Transaksi" value={activeRows.length} /><MiniStat label="Total berat bersih" value={`${totalWeight.toLocaleString('id-ID')} kg`} /></div></div>
    <div className="card overflow-hidden"><div className="px-5 py-4 border-b border-ink-900/8 flex flex-wrap gap-3 items-center justify-between"><div className="flex items-center gap-2"><ClipboardList size={17} className="text-plantation-700" /><h2 className="text-sm font-medium text-ink-700">Daftar pembelian</h2></div><div className="flex items-center gap-2"><label className="text-xs text-ink-500" htmlFor="payment-filter">Tampilkan</label><select id="payment-filter" className="rounded-md border border-ink-900/15 bg-white px-2 py-1.5 text-xs text-ink-700" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Semua status</option><option value="paid">Sudah bayar</option><option value="unpaid">Belum bayar</option></select></div></div><div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="table-head">No.</th><th className="table-head">CV / Jenis</th><th className="table-head">Nama penjual</th><th className="table-head">Status</th><th className="table-head">Berat kotor</th><th className="table-head">Berat bersih</th><th className="table-head">Harga/kg</th><th className="table-head">Total</th>{!isLocked && <th className="table-head"><span className="sr-only">Aksi</span></th>}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={isLocked ? 8 : 9} className="table-cell text-center text-ink-500 py-12">Tidak ada pembelian dengan status ini.</td></tr> : rows.map((item, index) => <tr key={item.id} className={item.status === 'voided' ? 'bg-red-50/40' : ''}><td className="table-cell text-ink-500">{index + 1}</td><td className="table-cell font-medium">{item.kind === 'brondolan' ? 'Brondolan' : item.cv || 'Belum dipilih'}</td><td className="table-cell">{item.name || supplierMap[item.supplierId]?.name || '—'}</td><td className="table-cell"><PaymentBadge status={item.paymentStatus || 'paid'} voided={item.status === 'voided'} disabled={isLocked} onConfirm={() => setPaymentTarget(item)} /></td><td className="table-cell">{Number(item.grossKg ?? item.weightKg ?? 0).toLocaleString('id-ID')} kg</td><td className="table-cell">{Number(item.netKg ?? item.weightKg ?? 0).toLocaleString('id-ID')} kg</td><td className="table-cell">{formatRupiah(item.pricePerKg)}</td><td className="table-cell font-medium">{formatRupiah(item.total)}</td>{!isLocked && <td className="table-cell">{item.status === 'voided' ? <span className="text-xs text-red-700">Dibatalkan</span> : hasPendingCancellation(item.id) ? <span className="text-xs text-gold-600">Menunggu owner</span> : <button type="button" onClick={() => setCancellationTarget(item)} className="rounded-md p-1.5 text-ink-500 hover:bg-red-50 hover:text-red-700" title="Ajukan pembatalan"><FileX2 size={16} /></button>}</td>}</tr>)}</tbody></table></div></div>
    <Modal open={!!paymentTarget} onClose={() => setPaymentTarget(null)} title="Konfirmasi pembayaran"><div className="space-y-4"><p className="text-sm leading-relaxed text-ink-700">Apakah pembelian dari <b>{paymentTarget?.name || supplierMap[paymentTarget?.supplierId]?.name || 'pemasok ini'}</b> sebesar <b>{formatRupiah(paymentTarget?.total)}</b> sudah dibayar?</p><div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setPaymentTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={confirmPayment}><CheckCircle2 size={16} /> Sudah dibayar</button></div></div></Modal>
    <Modal open={!!cancellationTarget} onClose={() => { setCancellationTarget(null); setRequestError('') }} title="Ajukan pembatalan transaksi"><form onSubmit={submitCancellation} className="space-y-4"><p className="text-sm text-ink-700">Permintaan akan diperiksa owner. Transaksi tidak akan dihapus dari riwayat.</p><div><label className="label" htmlFor="cancellation-reason">Alasan pembatalan</label><textarea id="cancellation-reason" className="input min-h-24" value={cancellationReason} onChange={(event) => { setCancellationReason(event.target.value); setRequestError('') }} placeholder="Contoh: berat timbang salah input" autoFocus /></div>{requestError && <p className="text-sm text-red-700">{requestError}</p>}<button type="submit" className="btn-danger w-full"><FileX2 size={16} /> Kirim ke owner</button></form></Modal>
  </div>
}

function PaymentBadge({ status, voided, disabled, onConfirm }) {
  if (voided) return <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Dibatalkan</span>
  if (status === 'unpaid') return <button type="button" disabled={disabled} onClick={onConfirm} title={disabled ? 'Kas hari ini sudah ditutup' : 'Klik untuk konfirmasi pembayaran'} className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2 py-1 text-xs font-medium text-gold-600 transition hover:bg-gold-400/30 disabled:cursor-default"><Clock3 size={13} /> Belum bayar</button>
  return <span className="inline-flex items-center gap-1 rounded-full bg-plantation-700/10 px-2 py-1 text-xs font-medium text-plantation-700"><CheckCircle2 size={13} /> Sudah bayar</span>
}

function MiniStat({ label, value }) { return <div className="card px-4 py-3"><p className="text-xs text-ink-500">{label}</p><p className="font-display text-lg text-plantation-900">{value}</p></div> }
