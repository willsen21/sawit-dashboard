import React, { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, Clock3, Plus, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate, todayKey } from '../../lib/dateUtils'
import { useParams } from 'react-router-dom'

const CVS = ['Sinar Mandiri', 'Jaya Agung']
const parseAmount = (value) => Number(String(value || '').replaceAll('.', '').replace(',', '.')) || 0
const formatNumericInput = (value) => String(value).replace(/[^0-9,]/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export default function PurchaseForm() {
  const { kind: routeKind } = useParams()
  const kind = routeKind === 'brondolan' ? 'brondolan' : 'buah'
  const { currentUser } = useAuth()
  const { addTransaction, getCashSummary } = useData()
  const date = todayKey()
  const summary = getCashSummary(date)
  const isLocked = summary.status === 'locked'
  const [form, setForm] = useState({ name: '', cv: CVS[0], paymentStatus: 'paid', grossKg: '', netKg: '', pricePerKg: '', note: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const total = parseAmount(form.netKg) * parseAmount(form.pricePerKg)

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
    if (total > summary.remaining) return setError(`Sisa kas tidak cukup. Kas tersedia: ${formatRupiah(summary.remaining)}.`)
    const now = new Date()
    addTransaction({ date, time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, kind, name: form.name.trim(), cv: kind === 'buah' ? form.cv : '', paymentStatus: form.paymentStatus, grossKg: parseAmount(form.grossKg), netKg: parseAmount(form.netKg), pricePerKg: parseAmount(form.pricePerKg), note: form.note, adminId: currentUser.id })
    setForm({ ...form, name: '', grossKg: '', netKg: '', pricePerKg: '', note: '' })
    setSuccess('Pembelian berhasil disimpan.')
  }

  return <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">
    <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Transaksi · {kind === 'brondolan' ? 'Brondolan' : 'Buah'}</p><h1 className="text-2xl font-display mt-1">Catat Pembelian {kind === 'brondolan' ? 'Brondolan' : 'Buah'}</h1><p className="text-sm text-ink-500 mt-1">{formatShortDate(date)} — isi data pembelian yang baru diterima.</p></div>
    {success && <div role="status" className="mb-5 flex w-full items-center gap-3 rounded-lg border border-plantation-700/25 bg-plantation-700/10 px-4 py-3 text-sm text-plantation-900"><CheckCircle2 size={19} className="shrink-0 text-plantation-700" /><span className="font-medium">{success}</span></div>}
    <div className="mb-5 flex items-center gap-3 rounded-lg border border-plantation-900/10 bg-white px-4 py-3 shadow-soft"><span className="cash-summary-icon !h-8 !w-8"><Wallet size={15} /></span><div className="flex-1"><p className="text-xs text-ink-500">Kas tersedia untuk transaksi</p><p className="font-display text-lg text-plantation-900">{formatRupiah(summary.remaining)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isLocked ? 'bg-gold-400/15 text-gold-600' : 'bg-plantation-700/10 text-plantation-700'}`}>{isLocked ? 'Kas ditutup' : 'Kas terbuka'}</span></div>
    {isLocked ? <div className="rounded-lg border border-gold-500/30 bg-gold-400/10 p-5 text-sm text-plantation-900"><CircleAlert size={18} className="inline mr-2 -mt-0.5" />Kas hari ini sudah ditutup. Buka kembali kas dari menu <b>Kas Hari Ini</b> sebelum mencatat pembelian.</div> : <form onSubmit={savePurchase} className="card p-5 md:p-6"><div className="grid gap-5 md:grid-cols-2"><Field label="Nama penjual"><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="mis. Pak Andi" autoFocus /></Field>{kind === 'buah' ? <Field label="CV"><select className="input" value={form.cv} onChange={(event) => setForm({ ...form, cv: event.target.value })}>{CVS.map((cv) => <option key={cv}>{cv}</option>)}</select></Field> : <Field label="Harga per kg bersih (Rp)"><input type="text" inputMode="numeric" className="input" value={form.pricePerKg} onChange={(event) => setForm({ ...form, pricePerKg: formatNumericInput(event.target.value) })} placeholder="mis. 2.300" /></Field>}<Field label="Berat kotor (kg)"><input type="text" inputMode="decimal" className="input" value={form.grossKg} onChange={(event) => setForm({ ...form, grossKg: formatNumericInput(event.target.value) })} placeholder="mis. 1.250" /></Field><Field label="Berat bersih (kg)"><input type="text" inputMode="decimal" className="input" value={form.netKg} onChange={(event) => setForm({ ...form, netKg: formatNumericInput(event.target.value) })} placeholder="mis. 1.210" /></Field><div><p className="label">Status pembayaran</p><PaymentPicker value={form.paymentStatus} onChange={(paymentStatus) => setForm({ ...form, paymentStatus })} /></div>{kind === 'buah' && <Field label="Harga per kg bersih (Rp)"><input type="text" inputMode="numeric" className="input" value={form.pricePerKg} onChange={(event) => setForm({ ...form, pricePerKg: formatNumericInput(event.target.value) })} placeholder="mis. 2.300" /></Field>}<Field label={kind === 'brondolan' ? 'Catatan (sebelah status)' : 'Catatan (opsional)'}><input className="input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="mis. potongan sortasi" /></Field></div><div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-ink-900/8 pt-5"><div><p className="text-xs text-ink-500">Total (berat bersih × harga/kg)</p><p className="font-display text-2xl text-plantation-900">{formatRupiah(total)}</p></div><button type="submit" className="btn-primary"><Plus size={16} /> Simpan pembelian</button></div>{error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}</form>}
  </div>
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function PaymentPicker({ value, onChange }) { return <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => onChange('paid')} className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm font-medium ${value === 'paid' ? 'border-plantation-700 bg-plantation-700/10 text-plantation-700' : 'border-ink-900/10 text-ink-500'}`}><CheckCircle2 size={15} /> Sudah bayar</button><button type="button" onClick={() => onChange('unpaid')} className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm font-medium ${value === 'unpaid' ? 'border-gold-500 bg-gold-400/15 text-gold-600' : 'border-ink-900/10 text-ink-500'}`}><Clock3 size={15} /> Belum bayar</button></div> }
